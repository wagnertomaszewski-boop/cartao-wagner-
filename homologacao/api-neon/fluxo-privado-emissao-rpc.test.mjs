import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {criarFluxoPrivadoEmissaoRpc} from './fluxo-privado-emissao-rpc.mjs';
const protocolo='LEGADO-EMISSAO-TESTE-900006',segredo=randomBytes(32);
function configurar({conferir=async()=>true,autorizar=async()=>true}={}){
 const eventos=[];
 const fluxo=criarFluxoPrivadoEmissaoRpc({
  segredoComprovante:segredo,conferirIdentidade:conferir,autorizarOperador:autorizar,
  auditarConferencia:async()=>{eventos.push('conferencia');},
  auditarTentativa:async()=>{eventos.push('tentativa');},
  consultarSupabasePrivado:async()=>[{id:900006,protocolo}],
  consultarNeon:async(sql,args)=>{
   if(sql.includes('pedidos_recuperacao'))return [{id:8}];
   if(sql.includes('emitir_chave_legada_teste_900006')){eventos.push('rpc');return [{emitido:true}];}
   throw Error('Consulta inesperada');
  }
 });
 return {fluxo,eventos};
}
test('conferência privada e auditoria precedem RPC',async()=>{
 const {fluxo,eventos}=configurar();
 const r=await fluxo.emitir({protocolo,referenciaOperador:'OP-TESTE-900006'});
 assert.equal(r.protocolo,protocolo);
 assert.ok(typeof r.chave==='string'&&r.chave.length>20);
 assert.deepEqual(eventos,['conferencia','tentativa','rpc']);
});
test('campo de cliente não autoriza emissão',async()=>{
 const {fluxo,eventos}=configurar({conferir:async()=>false});
 await assert.rejects(()=>fluxo.emitir({
  protocolo,referenciaOperador:'OP-TESTE-900006',
  identidadeConferida:true,solicitacaoId:900006,comprovante:'forjado'
 }),/Identidade não confirmada/);
 assert.deepEqual(eventos,[]);
});

test('referência de operador sem autorização não inicia conferência nem emissão',async()=>{
 const {fluxo,eventos}=configurar({autorizar:async()=>false});
 await assert.rejects(()=>fluxo.emitir({protocolo,referenciaOperador:'OP-TESTE-900006',identidadeConferida:true}),/Operador não autorizado/);
 assert.deepEqual(eventos,[]);
});
test('falha de autorização do operador bloqueia emissão',async()=>{
 const {fluxo,eventos}=configurar({autorizar:async()=>{throw Error('indisponível');}});
 await assert.rejects(()=>fluxo.emitir({protocolo,referenciaOperador:'OP-TESTE-900006'}),/Autorização de operador indisponível/);
 assert.deepEqual(eventos,[]);
});
