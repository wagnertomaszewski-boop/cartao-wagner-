import test from 'node:test';
import assert from 'node:assert/strict';
import {criarTransacaoChavesNeon} from './transacao-chaves-neon.mjs';
function fixture({falharEm}={}) {
 const log=[];
 const client={
  async query(sql,params=[]) {
   const tipo=sql.split(' ')[0];
   log.push(tipo);
   if(tipo===falharEm)throw Error('Falha simulada '+tipo);
   if(tipo==='SELECT')return {rowCount:1,rows:[{id:'900010'}]};
   return {rowCount:1};
  },
  release(){log.push('release');}
 };
 return {log,transacionar:criarTransacaoChavesNeon({pool:{connect:async()=>client}})};
}
test('rotação bloqueia solicitação, revoga e grava hash antes do commit',async()=>{
 const {log,transacionar}=fixture();
 await transacionar(async tx=>{
  assert.equal(await tx.revogarAtiva({solicitacaoId:'900010'}),1);
  await tx.inserirHash({solicitacaoId:'900010',hash:Buffer.alloc(32),operadorId:'123e4567-e89b-42d3-a456-426614174000'});
 });
 assert.deepEqual(log,['BEGIN','SELECT','UPDATE','INSERT','COMMIT','release']);
});
test('erro de gravação causa rollback',async()=>{
 const {log,transacionar}=fixture({falharEm:'INSERT'});
 await assert.rejects(transacionar(async tx=>{
  await tx.revogarAtiva({solicitacaoId:'900010'});
  await tx.inserirHash({solicitacaoId:'900010',hash:Buffer.alloc(32),operadorId:'123e4567-e89b-42d3-a456-426614174000'});
 }),/Falha simulada/);
 assert.deepEqual(log,['BEGIN','SELECT','UPDATE','INSERT','ROLLBACK','release']);
});
test('impede inserir sem bloqueio',async()=>{
 const {log,transacionar}=fixture();
 await assert.rejects(transacionar(tx=>tx.inserirHash({solicitacaoId:'900010',hash:Buffer.alloc(32)})),/Pré-condições/);
 assert.deepEqual(log,['BEGIN','ROLLBACK','release']);
});
test('rejeita SQL arbitrário na auditoria',async()=>{
 const {log,transacionar}=fixture();
 await assert.rejects(transacionar(tx=>tx.queryAuditoria('DELETE FROM solicitacoes',[])),/não autorizado/);
 assert.deepEqual(log,['BEGIN','ROLLBACK','release']);
});
