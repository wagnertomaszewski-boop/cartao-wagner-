import test from 'node:test';
import assert from 'node:assert/strict';
import {criarAuditorChavesNeon} from './auditoria-chaves-neon.mjs';
test('auditoria grava apenas metadados e parâmetros',async()=>{
 let sql,params;
 await criarAuditorChavesNeon()({tx:{queryAuditoria:async(s,p)=>{sql=s;params=p;return {rowCount:1};}},acao:'emitir',solicitacaoId:'900010',operadorId:'123e4567-e89b-42d3-a456-426614174000',revogadas:1});
 assert.match(sql,/^INSERT INTO mandato_chaves_homologacao\.auditoria_chaves/);
 assert.equal(params.length,4);
 assert.deepEqual(params.slice(2),['emitir',1]);
});
test('falha sem persistência de auditoria',async()=>{
 await assert.rejects(criarAuditorChavesNeon()({tx:{queryAuditoria:async()=>({rowCount:0})},acao:'revogar',solicitacaoId:'900010',operadorId:'123e4567-e89b-42d3-a456-426614174000',revogadas:0}),/não persistida/);
});
test('nega auditoria fora da transação',async()=>{
 await assert.rejects(criarAuditorChavesNeon()({acao:'emitir',solicitacaoId:'900010',operadorId:'123e4567-e89b-42d3-a456-426614174000',revogadas:0}),/transacional/);
});
