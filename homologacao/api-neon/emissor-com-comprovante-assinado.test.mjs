import test from 'node:test';
import assert from 'node:assert/strict';
import {criarEmissorComComprovanteAssinado} from './emissor-com-comprovante-assinado.mjs';
import {criarEmissorComprovanteAssinado} from './comprovante-assinado.mjs';
const segredo=Buffer.alloc(32,8),agora=1794000000000;
const comprovante=criarEmissorComprovanteAssinado({
 segredo,relogio:()=>agora,gerarNonce:()=> 'b'.repeat(32)
})({protocolo:'LEGADO-TESTE',identidadeConferida:true});
test('emissor rejeita comprovante inválido antes de consultar banco',async()=>{
 let consultas=0;
 const emissor=criarEmissorComComprovanteAssinado({
  poolNeon:{connect:async()=>{consultas++;throw Error('não consultar')}},
  consultarSupabasePrivado:async()=>{consultas++;return []},
  segredoComprovante:segredo,relogio:()=>agora,auditarTentativa:async()=>{}
 });
 await assert.rejects(()=>emissor.emitir({protocolo:'LEGADO-TESTE',comprovante:'invalido'}),/Identidade não confirmada/);
 assert.equal(consultas,0);
});
test('comprovante legítimo avança à conferência do vínculo, mas divergência bloqueia',async()=>{
 let consultas=0,neon=false;
 const emissor=criarEmissorComComprovanteAssinado({
  poolNeon:{connect:async()=>{neon=true;throw Error('não consultar')}},
  consultarSupabasePrivado:async()=>{consultas++;return [{id:900005,protocolo:'OUTRO'}]},
  segredoComprovante:segredo,relogio:()=>agora,auditarTentativa:async()=>{}
 });
 await assert.rejects(()=>emissor.emitir({protocolo:'LEGADO-TESTE',comprovante}),/Identidade não confirmada/);
 assert.equal(consultas,1);
 assert.equal(neon,false);
});
test('sem segredo privado o emissor não inicia',()=>{
 assert.throws(()=>criarEmissorComComprovanteAssinado({
  poolNeon:{connect:async()=>{}},consultarSupabasePrivado:async()=>[],
  segredoComprovante:Buffer.alloc(4)
 }),/Configuração privada inválida/);
});
