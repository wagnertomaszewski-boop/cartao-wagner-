import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {criarFluxoComOperadorAutenticado} from './fluxo-operador-autenticado.mjs';
const protocolo='LEGADO-EMISSAO-TESTE-900006';
const uid='11111111-1111-4111-8111-111111111111';
function configurar({autenticado=true,conferido=true}={}){
 const eventos=[];
 const fluxo=criarFluxoComOperadorAutenticado({
  supabaseUrl:'https://pmmsdjozyyxkbuqlkfpb.supabase.co',
  supabaseProjectRef:'pmmsdjozyyxkbuqlkfpb',
  supabaseServiceRoleKey:'x'.repeat(32),
  supabasePublishableKey:'sb_publishable_exemplo',
  idsOperadoresPermitidos:[uid],segredoComprovante:randomBytes(32),
  buscarAuth:async()=>{eventos.push('auth');return {ok:true,json:async()=>({
   id:autenticado?uid:'22222222-2222-4222-8222-222222222222',aud:'authenticated',is_anonymous:false
  })};},
  conferirIdentidade:async()=>{eventos.push('identidade');return conferido;},
  auditarConferencia:async()=>{eventos.push('auditoria');},
  auditarTentativa:async()=>{eventos.push('tentativa');},
  fetchPrivado:async()=>{eventos.push('supabase');return {ok:true,json:async()=>[{id:900006,protocolo}]};},
  consultarNeon:async(sql)=>{
   if(sql.includes('pedidos_recuperacao'))return [{id:1}];
   if(sql.includes('emitir_chave_legada_teste_900006')){eventos.push('rpc');return [{emitido:true}];}
   throw Error('SQL inesperado');
  }
 });
 return {fluxo,eventos};
}
test('autorização de sessão precede conferência e consulta',async()=>{
 const {fluxo,eventos}=configurar();
 const resposta=await fluxo.emitir({protocolo,referenciaOperador:'OP-TESTE-900006',tokenOperador:'t'.repeat(30)});
 assert.equal(resposta.protocolo,protocolo);
 assert.deepEqual(eventos,['auth','identidade','auditoria','supabase','tentativa','rpc']);
});
test('sessão não autorizada não inicia verificação de identidade',async()=>{
 const {fluxo,eventos}=configurar({autenticado:false});
 await assert.rejects(()=>fluxo.emitir({protocolo,referenciaOperador:'OP-TESTE-900006',tokenOperador:'t'.repeat(30)}),/Operador não autorizado/);
 assert.deepEqual(eventos,['auth']);
});
test('identidade não confirmada não consulta dados',async()=>{
 const {fluxo,eventos}=configurar({conferido:false});
 await assert.rejects(()=>fluxo.emitir({protocolo,referenciaOperador:'OP-TESTE-900006',tokenOperador:'t'.repeat(30)}),/Identidade não confirmada/);
 assert.deepEqual(eventos,['auth','identidade']);
});
