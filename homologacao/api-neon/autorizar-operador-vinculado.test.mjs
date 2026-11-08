import test from 'node:test';
import assert from 'node:assert/strict';
import {criarAutorizadorOperadorVinculado} from './autorizar-operador-vinculado.mjs';
const uid='11111111-1111-4111-8111-111111111111';
const base={supabaseUrl:'https://pmmsdjozyyxkbuqlkfpb.supabase.co',chavePublica:'sb_publishable_teste',
 operadores:{[uid]:'OP-TESTE-900006'}};
test('UID autenticado só pode agir pela própria referência',async()=>{
 const autorizar=criarAutorizadorOperadorVinculado({...base,buscar:async()=>({
  ok:true,json:async()=>({id:uid,aud:'authenticated',is_anonymous:false})
 })});
 assert.equal(await autorizar({tokenOperador:'t'.repeat(30),referenciaOperador:'OP-TESTE-900006'}),true);
 assert.equal(await autorizar({tokenOperador:'t'.repeat(30),referenciaOperador:'OP-OUTRO-900006'}),false);
});
test('sessão de outro UID não pode se passar pelo operador',async()=>{
 const autorizar=criarAutorizadorOperadorVinculado({...base,buscar:async()=>({
  ok:true,json:async()=>({id:'22222222-2222-4222-8222-222222222222',aud:'authenticated',is_anonymous:false})
 })});
 assert.equal(await autorizar({tokenOperador:'t'.repeat(30),referenciaOperador:'OP-TESTE-900006'}),false);
});
test('não aceita referências duplicadas na configuração',()=>{
 assert.throws(()=>criarAutorizadorOperadorVinculado({...base,operadores:{
  [uid]:'OP-TESTE-900006','22222222-2222-4222-8222-222222222222':'OP-TESTE-900006'
 }}),/inválido/);
});
