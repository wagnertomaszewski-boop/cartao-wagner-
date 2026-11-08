import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {criarFluxoPrivadoComSupabase} from './fluxo-privado-com-supabase.mjs';
const protocolo='LEGADO-EMISSAO-TESTE-900006';
function criar({autorizarOperador=async()=>true,conferirIdentidade=async()=>true}={}){
 const eventos=[];
 const fluxo=criarFluxoPrivadoComSupabase({
  supabaseUrl:'https://pmmsdjozyyxkbuqlkfpb.supabase.co',supabaseProjectRef:'pmmsdjozyyxkbuqlkfpb',
  supabaseServiceRoleKey:'x'.repeat(32),
  segredoComprovante:randomBytes(32),
  autorizarOperador,conferirIdentidade,
  auditarConferencia:async()=>{eventos.push('auditoria-identidade');},
  auditarTentativa:async()=>{eventos.push('auditoria-tentativa');},
  fetchPrivado:async(url,opcoes)=>{
   eventos.push('supabase');
   assert.equal(opcoes.method,'GET');
   assert.equal(new URL(url).searchParams.get('protocolo'),'eq.'+protocolo);
   return {ok:true,json:async()=>[{id:900006,protocolo}]};
  },
  consultarNeon:async(sql)=>{
   if(sql.includes('pedidos_recuperacao'))return [{id:1}];
   if(sql.includes('emitir_chave_legada_teste_900006')){eventos.push('rpc');return [{emitido:true}];}
   throw Error('SQL inesperado');
  }
 });
 return {fluxo,eventos};
}
test('integra Supabase privado e RPC após autorização e conferência',async()=>{
 const {fluxo,eventos}=criar();
 const resposta=await fluxo.emitir({protocolo,referenciaOperador:'OP-TESTE-900006'});
 assert.equal(resposta.protocolo,protocolo);
 assert.deepEqual(eventos,['auditoria-identidade','supabase','auditoria-tentativa','rpc']);
});
test('operador não autorizado não consulta Supabase',async()=>{
 const {fluxo,eventos}=criar({autorizarOperador:async()=>false});
 await assert.rejects(()=>fluxo.emitir({protocolo,referenciaOperador:'OP-TESTE-900006'}),/não autorizado/);
 assert.deepEqual(eventos,[]);
});
test('identidade não conferida não consulta Supabase',async()=>{
 const {fluxo,eventos}=criar({conferirIdentidade:async()=>false});
 await assert.rejects(()=>fluxo.emitir({protocolo,referenciaOperador:'OP-TESTE-900006'}),/não confirmada/);
 assert.deepEqual(eventos,[]);
});
