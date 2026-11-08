import test from 'node:test';
import assert from 'node:assert/strict';
import {criarRepositorioChavesLegadas} from './repositorio-chaves-legadas.mjs';
import {criarTransacionarPostgres} from './transacao-postgres.mjs';
test('falha na auditoria provoca ROLLBACK das três gravações',async()=>{
 const sql=[];
 let liberado=false;
 const pool={connect:async()=>({
  query:async(q,args)=>{
   sql.push(q);
   if(q.includes('FROM mandato_testes.solicitacoes'))return {rows:[{id:900004}]};
   if(q.includes('INSERT INTO mandato_testes.auditoria_chaves_legadas'))throw Error('auditoria indisponível');
   return {rows:[]};
  },
  release:()=>{liberado=true}
 })};
 const repositorio=criarRepositorioChavesLegadas({transacionar:criarTransacionarPostgres(pool)});
 await assert.rejects(()=>repositorio.persistirHash({protocolo:'LEGADO-TESTE',hash:'a'.repeat(64),solicitacaoId:900004}),/auditoria indisponível/);
 assert.equal(sql[0],'BEGIN');
 assert.equal(sql.at(-1),'ROLLBACK');
 assert.equal(sql.includes('COMMIT'),false);
 assert.equal(sql.filter(q=>q.startsWith('INSERT')).length,3);
 assert.equal(liberado,true);
});

test('falha ao gravar vínculo também desfaz a transação',async()=>{
 const sql=[];let liberado=false;
 const pool={connect:async()=>({
  query:async q=>{
   sql.push(q);
   if(q.includes('FROM mandato_testes.solicitacoes'))return {rows:[{id:900004}]};
   if(q.includes('INSERT INTO mandato_testes.acessos_protocolo'))throw Error('falha de vínculo');
   return {rows:[]};
  },
  release:()=>{liberado=true}
 })};
 const repositorio=criarRepositorioChavesLegadas({transacionar:criarTransacionarPostgres(pool)});
 await assert.rejects(()=>repositorio.persistirHash({protocolo:'LEGADO-TESTE',hash:'a'.repeat(64),solicitacaoId:900004}),/falha de vínculo/);
 assert.equal(sql.at(-1),'ROLLBACK');
 assert.equal(sql.includes('COMMIT'),false);
 assert.equal(sql.filter(q=>q.startsWith('INSERT')).length,2);
 assert.equal(liberado,true);
});
