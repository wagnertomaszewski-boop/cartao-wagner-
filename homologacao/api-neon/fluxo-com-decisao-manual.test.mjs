import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {criarFluxoComDecisaoManual} from './fluxo-com-decisao-manual.mjs';
const protocolo='LEGADO-EMISSAO-TESTE-900006',operador='OP-TESTE-900006',agora=1794100000000;
function montar({aprovado=true}={}){
 const eventos=[];
 const fluxo=criarFluxoComDecisaoManual({
  supabaseUrl:'https://pmmsdjozyyxkbuqlkfpb.supabase.co',
  supabaseProjectRef:'pmmsdjozyyxkbuqlkfpb',
  supabaseServiceRoleKey:'x'.repeat(32),
  supabasePublishableKey:'sb_publishable_exemplo',
  idsOperadoresPermitidos:['11111111-1111-4111-8111-111111111111'],
  segredoComprovante:randomBytes(32),relogio:()=>agora,
  buscarAuth:async()=>{eventos.push('auth');return {ok:true,json:async()=>({
   id:'11111111-1111-4111-8111-111111111111',aud:'authenticated',is_anonymous:false
  })};},
  consultarDecisao:async()=>{eventos.push('decisao');return {
   protocolo,operador,identidadeVerificada:aprovado,evidenciaConferida:true,
   status:'aprovado',registroId:'REG-TESTE-900006',decididoEmMs:agora-1000
  };},
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
test('decisão manual auditada integra fluxo Auth-Supabase-Neon',async()=>{
 const {fluxo,eventos}=montar();
 const resposta=await fluxo.emitir({protocolo,referenciaOperador:operador,tokenOperador:'t'.repeat(30)});
 assert.equal(resposta.protocolo,protocolo);
 assert.deepEqual(eventos,['auth','decisao','auditoria','supabase','tentativa','rpc']);
});
test('decisão sem identidade verificada impede consulta e emissão',async()=>{
 const {fluxo,eventos}=montar({aprovado:false});
 await assert.rejects(()=>fluxo.emitir({protocolo,referenciaOperador:operador,tokenOperador:'t'.repeat(30)}),/Identidade não confirmada/);
 assert.deepEqual(eventos,['auth','decisao']);
});
