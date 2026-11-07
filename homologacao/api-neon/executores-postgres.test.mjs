import {test} from 'node:test';
import assert from 'node:assert/strict';
import {criarExecutoresPostgres} from './executores-postgres.mjs';

function simularPool({falhar=false}={}) {
 const eventos=[];
 const pool={async connect(){eventos.push('connect');return {
  async query(sql,params){eventos.push([sql,params]);if(falhar && sql.startsWith('SELECT'))throw Error('Falha simulada');return {rows:[{ok:true}]};},
  release(){eventos.push('release');}
 };}};
 return {pool,eventos};
}
test('cidadão usa transação, papel limitado e parâmetros',async()=>{
 const {pool,eventos}=simularPool();
 const {executarCidadao}=criarExecutoresPostgres({pool});
 assert.deepEqual(await executarCidadao('SELECT mandato_testes.pedir_recuperacao($1,$2)',['TESTE','5199']),[{ok:true}]);
 assert.deepEqual(eventos.map(x=>Array.isArray(x)?x[0]:x),['connect','BEGIN',"SET LOCAL statement_timeout = '3000ms'",'SET LOCAL ROLE mandato_cidadao_a','SELECT mandato_testes.pedir_recuperacao($1,$2)','COMMIT','release']);
 assert.deepEqual(eventos[4][1],['TESTE','5199']);
});
test('admin usa papel próprio e rollback em falha',async()=>{
 const {pool,eventos}=simularPool({falhar:true});
 const {executarAdmin}=criarExecutoresPostgres({pool});
 await assert.rejects(executarAdmin('SELECT * FROM mandato_testes.decidir_recuperacao($1,$2)',['12',true]));
 assert.ok(eventos.some(x=>Array.isArray(x)&&x[0]==='SET LOCAL ROLE mandato_admin_teste'));
 assert.ok(eventos.some(x=>Array.isArray(x)&&x[0]==='ROLLBACK'));
 assert.equal(eventos.at(-1),'release');
});
test('não aceita SQL fora da lista de funções autorizadas',async()=>{
 const {pool,eventos}=simularPool();
 const {executarCidadao}=criarExecutoresPostgres({pool});
 await assert.rejects(executarCidadao('DELETE FROM mandato_testes.solicitacoes'));
 await assert.rejects(executarCidadao('SELECT * FROM mandato_testes.solicitacoes'));
 await assert.rejects(executarCidadao('SELECT * FROM mandato_testes.decidir_recuperacao($1,$2)', ['12',true]));
 assert.deepEqual(eventos,[]);
});
