import test from 'node:test';
import assert from 'node:assert/strict';
import {criarEmissorRpcFicticio} from './emissor-rpc-ficticio.mjs';
import {criarEmissorComprovanteAssinado} from './comprovante-assinado.mjs';
const protocolo='LEGADO-EMISSAO-TESTE-900005',id=900005,agora=1794000000000,segredo=Buffer.alloc(32,9);
const comprovante=criarEmissorComprovanteAssinado({
 segredo,relogio:()=>agora,gerarNonce:()=> 'c'.repeat(32)
})({protocolo,identidadeConferida:true});
function montar({vinculo=true,aprovado=true,emitido=true}={}){
 const chamadas=[];
 const emissor=criarEmissorRpcFicticio({
  segredoComprovante:segredo,relogio:()=>agora,
  consultarSupabasePrivado:async(sql,args)=>{
   chamadas.push({tipo:'vinculo',sql,args});
   return vinculo?[{id,protocolo}]:[];
  },
  consultarNeon:async(sql,args)=>{
   chamadas.push({tipo:'neon',sql,args});
   if(sql.includes('pedidos_recuperacao'))return aprovado?[{id:7}]:[];
   if(sql.includes('emitir_chave_legada_teste_900005'))return [{emitido}];
   throw Error('SQL inesperado');
  },
  auditarTentativa:async()=>{chamadas.push({tipo:'auditoria'});}
 });
 return {emissor,chamadas};
}
test('fluxo integrado emite chave aleatória apenas após todas as verificações',async()=>{
 const {emissor,chamadas}=montar();
 const r=await emissor.emitir({protocolo,comprovante});
 assert.equal(r.protocolo,protocolo);
 assert.match(r.chave,/^[a-f0-9]{64}$/);
 assert.deepEqual(chamadas.map(x=>x.tipo),['vinculo','neon','auditoria','neon']);
 assert.match(chamadas[3].sql,/emitir_chave_legada_teste_900005/);
 assert.match(chamadas[3].args[2],/^[a-f0-9]{64}$/);
 assert.notEqual(chamadas[3].args[2],r.chave);
});
test('comprovante incorreto impede qualquer consulta',async()=>{
 const {emissor,chamadas}=montar();
 await assert.rejects(()=>emissor.emitir({protocolo,comprovante:'falso'}),/Identidade não confirmada/);
 assert.equal(chamadas.length,0);
});
test('sem vínculo ou aprovação não emite nem grava',async()=>{
 for(const cenario of [{vinculo:false},{aprovado:false}]){
  const {emissor,chamadas}=montar(cenario);
  await assert.rejects(()=>emissor.emitir({protocolo,comprovante}),/Identidade não confirmada/);
  assert.equal(chamadas.some(x=>x.sql?.includes('emitir_chave_legada_teste')),false);
 }
});
test('falha da RPC impede entregar a chave',async()=>{
 const {emissor}=montar({emitido:false});
 await assert.rejects(()=>emissor.emitir({protocolo,comprovante}),/Emissão não confirmada/);
});
