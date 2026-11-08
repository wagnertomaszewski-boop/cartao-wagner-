import test from 'node:test';
import assert from 'node:assert/strict';
import {criarAutorizadorOperadorSupabase} from './autorizar-operador-supabase.mjs';
const id='11111111-1111-4111-8111-111111111111';
const base={supabaseUrl:'https://pmmsdjozyyxkbuqlkfpb.supabase.co',chavePublica:'sb_publishable_exemplo',idsPermitidos:[id]};
test('aceita somente sessão de usuário permitido confirmada pelo servidor',async()=>{
 let chamadas=0;
 const autorizar=criarAutorizadorOperadorSupabase({...base,buscar:async(url,opcoes)=>{
  chamadas++;
  assert.equal(url,'https://pmmsdjozyyxkbuqlkfpb.supabase.co/auth/v1/user');
  assert.equal(opcoes.headers.Authorization,'Bearer '+ 't'.repeat(30));
  return {ok:true,json:async()=>({id,aud:'authenticated',is_anonymous:false})};
 }});
 assert.equal(await autorizar({referenciaOperador:'OP-TESTE-900006',tokenOperador:'t'.repeat(30)}),true);
 assert.equal(chamadas,1);
 assert.equal(await autorizar({referenciaOperador:'qualquer',tokenOperador:'t'.repeat(30)}),false);
 assert.equal(chamadas,1);
});
test('rejeita sessão anônima ou identidade não permitida',async()=>{
 const autorizar=criarAutorizadorOperadorSupabase({...base,buscar:async()=>({ok:true,json:async()=>({id,aud:'authenticated',is_anonymous:true})})});
 assert.equal(await autorizar({referenciaOperador:'OP-TESTE-900006',tokenOperador:'t'.repeat(30)}),false);
});
test('falha fechada se Supabase Auth estiver indisponível',async()=>{
 const autorizar=criarAutorizadorOperadorSupabase({...base,buscar:async()=>{throw Error('offline');}});
 assert.equal(await autorizar({referenciaOperador:'OP-TESTE-900006',tokenOperador:'t'.repeat(30)}),false);
});
