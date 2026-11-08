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
 const repo=criarRepositorioChavesLegadas({transacionar:async fn=>fn(async(q,args)=>{sql.push([q,args]);return q.startsWith('SELECT id')?[{id:900003}]:[];})});
 assert.deepEqual(await repo.persistirHash({protocolo:' LEGADO-TESTE ',hash,solicitacaoId:900003}),{gravado:true});
 assert.match(sql[0][0],/pg_advisory_xact_lock/);
 assert.match(sql[1][0],/SELECT 1/);
 assert.match(sql[2][0],/SELECT solicitacao_id/);
 assert.match(sql[3][0],/SELECT id/);
 assert.deepEqual(sql[4][1],['LEGADO-TESTE',hash]);
 assert.deepEqual(sql[5][1],[900003,'LEGADO-TESTE',hash]);
 assert.match(sql[6][0],/INSERT INTO mandato_testes.auditoria_chaves_legadas/);
 assert.deepEqual(sql[6][1],['LEGADO-TESTE',900003,'chave_legada_emitida']);
});
test('chave existente bloqueia segunda emissão',async()=>{
 const sql=[];
 const repo=criarRepositorioChavesLegadas({transacionar:async fn=>fn(async(q,args)=>{sql.push(q);return q.startsWith('SELECT 1')?[{exists:1}]:[];})});
 await assert.rejects(()=>repo.persistirHash({protocolo:'LEGADO-TESTE',hash,solicitacaoId:900003}),/já possui chave/);
 assert.equal(sql.some(q=>q.startsWith('INSERT')),false);
});
