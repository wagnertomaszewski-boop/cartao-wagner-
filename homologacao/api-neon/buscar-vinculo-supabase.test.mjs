import test from 'node:test';
import assert from 'node:assert/strict';
import {criarBuscaVinculoSupabase} from './buscar-vinculo-supabase.mjs';
test('vinculo retorna somente id e protocolo coincidentes',async()=>{
 let consulta;
 const buscar=criarBuscaVinculoSupabase({consultar:async(sql,args)=>{consulta={sql,args};return [{id:'900005',protocolo:'LEGADO-900005'}]}});
 assert.deepEqual(await buscar({protocolo:' LEGADO-900005 '}),{solicitacaoId:900005,protocolo:'LEGADO-900005'});
 assert.match(consulta.sql,/WHERE protocolo=\$1 LIMIT 2/);
 assert.deepEqual(consulta.args,['LEGADO-900005']);
});
test('falha fechada para duplicado, divergente, id inseguro e erro',async()=>{
 for(const linhas of [[],[{id:1,protocolo:'ERRADO'}],[{id:1,protocolo:'P'},{id:2,protocolo:'P'}],[{id:'9007199254740993',protocolo:'P'}]]){
  const buscar=criarBuscaVinculoSupabase({consultar:async()=>linhas});
  assert.equal(await buscar({protocolo:'P'}),null);
 }
 assert.equal(await criarBuscaVinculoSupabase({consultar:async()=>{throw Error('offline')}})({protocolo:'P'}),null);
});
