import test from 'node:test';
import assert from 'node:assert/strict';
import {criarConsultaPrivadaSupabase} from './consulta-privada-supabase-rest.mjs';
const url='https://pmmsdjozyyxkbuqlkfpb.supabase.co',serviceRoleKey='x'.repeat(32);
const sql='SELECT id, protocolo FROM public.solicitacoes WHERE protocolo=$1 LIMIT 2';
test('faz apenas leitura privada parametrizada e sem redirecionamento',async()=>{
 let chamadas=0;
 const consultar=criarConsultaPrivadaSupabase({url,expectedProjectRef:'pmmsdjozyyxkbuqlkfpb',serviceRoleKey,fetchPrivado:async(destino,opcoes)=>{
  chamadas++;
  const u=new URL(destino);
  assert.equal(u.hostname,'pmmsdjozyyxkbuqlkfpb.supabase.co');
  assert.equal(u.searchParams.get('select'),'id,protocolo');
  assert.equal(u.searchParams.get('protocolo'),'eq.LEGADO-EMISSAO-TESTE-900006');
  assert.equal(u.searchParams.get('limit'),'2');
  assert.equal(opcoes.method,'GET');
  assert.equal(opcoes.redirect,'error');
  assert.equal(opcoes.headers.apikey,serviceRoleKey);
  return {ok:true,json:async()=>[{id:900006,protocolo:'LEGADO-EMISSAO-TESTE-900006'}]};
 }});
 assert.deepEqual(await consultar(sql,['LEGADO-EMISSAO-TESTE-900006']),[{id:900006,protocolo:'LEGADO-EMISSAO-TESTE-900006'}]);
 assert.equal(chamadas,1);
});
test('nega consulta arbitrária e protocolo com operadores de filtro',async()=>{
 const consultar=criarConsultaPrivadaSupabase({url,expectedProjectRef:'pmmsdjozyyxkbuqlkfpb',serviceRoleKey,fetchPrivado:async()=>{throw Error('Não deve consultar');}});
 await assert.rejects(()=>consultar('SELECT * FROM public.solicitacoes',[]),/não autorizada/);
 await assert.rejects(()=>consultar(sql,['x,or.(id.gt.0)']),/não autorizada/);
});
test('falha fechada sem credencial e com URL insegura',()=>{
 assert.throws(()=>criarConsultaPrivadaSupabase({url,serviceRoleKey:'curta'}),/incompleta/);
 assert.throws(()=>criarConsultaPrivadaSupabase({url:'http://pmmsdjozyyxkbuqlkfpb.supabase.co',serviceRoleKey}),/não autorizada/);
});

test('impede conexão acidental a outro projeto Supabase',()=>{
 assert.throws(()=>criarConsultaPrivadaSupabase({url,expectedProjectRef:'aaaaaaaaaaaaaaaaaaaa',serviceRoleKey}),/não autorizada/);
});
