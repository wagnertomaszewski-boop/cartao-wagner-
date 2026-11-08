import test from 'node:test';
import assert from 'node:assert/strict';
import {criarRepositorioChavesLegadas} from './repositorio-chaves-legadas.mjs';
const hash='a'.repeat(64);
test('sem transação ou dados válidos não grava',async()=>{
 assert.throws(()=>criarRepositorioChavesLegadas(),/Transação/);
 const repo=criarRepositorioChavesLegadas({transacionar:async fn=>fn(async()=>[])});
 await assert.rejects(()=>repo.persistirHash({protocolo:'X',hash:'curto'}),/inválidos/);
});
test('bloqueia protocolo e grava somente hash na transação',async()=>{
 const sql=[];
 const repo=criarRepositorioChavesLegadas({transacionar:async fn=>fn(async(q,args)=>{sql.push([q,args]);return [];})});
 assert.deepEqual(await repo.persistirHash({protocolo:' LEGADO-TESTE ',hash}),{gravado:true});
 assert.match(sql[0][0],/pg_advisory_xact_lock/);
 assert.match(sql[1][0],/SELECT 1/);
 assert.match(sql[2][0],/INSERT INTO mandato_testes.chaves_legadas/);
 assert.deepEqual(sql[2][1],['LEGADO-TESTE',hash]);
});
test('chave existente bloqueia segunda emissão',async()=>{
 const sql=[];
 const repo=criarRepositorioChavesLegadas({transacionar:async fn=>fn(async(q,args)=>{sql.push(q);return q.startsWith('SELECT 1')?[{exists:1}]:[];})});
 await assert.rejects(()=>repo.persistirHash({protocolo:'LEGADO-TESTE',hash}),/já possui chave/);
 assert.equal(sql.some(q=>q.startsWith('INSERT')),false);
});
