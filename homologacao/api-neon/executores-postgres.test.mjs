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
 await assert.rejects(executarCidadao('SELECT mandato_testes.pedir_recuperacao($1,$2)', ['somente-um']));
 await assert.rejects(executarCidadao('SELECT mandato_testes.pedir_recuperacao($1,$2)', ['a','b','c']));
 assert.deepEqual(eventos,[]);
});

test('cidadão pode consultar respostas apenas pela função segura parametrizada',async()=>{
 const {pool,eventos}=simularPool();
 const {executarCidadao}=criarExecutoresPostgres({pool});
 const chave='a'.repeat(64);
 await executarCidadao('SELECT * FROM mandato_testes.consulta_respostas_segura($1,$2)',['TESTE-000001',chave]);
 assert.ok(eventos.some(x=>Array.isArray(x)&&x[0]==='SET LOCAL ROLE mandato_cidadao_a'));
 assert.ok(eventos.some(x=>Array.isArray(x)&&x[0]==='SELECT * FROM mandato_testes.consulta_respostas_segura($1,$2)'&&x[1][1]===chave));
 await assert.rejects(executarCidadao('SELECT * FROM mandato_testes.respostas WHERE protocolo=$1',['TESTE-000001']));
});

test('histórico usa somente função protegida com dois parâmetros',async()=>{
 const {pool,eventos}=simularPool();
 const {executarCidadao,executarAdmin}=criarExecutoresPostgres({pool});
 const sql='SELECT * FROM mandato_testes.consulta_historico_segura($1,$2)';
 const chave='c'.repeat(64);
 await executarCidadao(sql,['HIST-TESTE-900001',chave]);
 assert.ok(eventos.some(x=>Array.isArray(x)&&x[0]===sql&&x[1][1]===chave));
 await assert.rejects(executarCidadao('SELECT * FROM mandato_testes.historico_status'));
 await assert.rejects(executarAdmin(sql,['HIST-TESTE-900001',chave]));
});

test('nomes de anexos só pela função autorizada e sem acesso direto',async()=>{
 const {pool,eventos}=simularPool();
 const {executarCidadao,executarAdmin}=criarExecutoresPostgres({pool});
 const sql='SELECT * FROM mandato_testes.consulta_nomes_anexos_segura($1,$2)';
 const params=['HIST-TESTE-900001','a'.repeat(64)];
 await executarCidadao(sql,params);
 assert.ok(eventos.some(x=>Array.isArray(x)&&x[0]===sql&&x[1]===params));
 const antes=eventos.length;
 await assert.rejects(executarCidadao('SELECT * FROM mandato_testes.anexos'));
 await assert.rejects(executarCidadao('SELECT * FROM mandato_testes.consulta_anexos_segura($1,$2)',params));
 await assert.rejects(executarAdmin(sql,params));
 assert.equal(eventos.length,antes);
});

test('criação de solicitação não pode aceitar identidade arbitrária pelo executor',async()=>{
 const {pool,eventos}=simularPool();
 const {executarCidadao,executarAdmin}=criarExecutoresPostgres({pool});
 const sql='SELECT * FROM mandato_testes.criar_solicitacao_segura($1,$2,$3)';
 await assert.rejects(executarCidadao(sql,['11111111-1111-4111-8111-111111111111','Assunto','Descrição']));
 await assert.rejects(executarAdmin(sql,['11111111-1111-4111-8111-111111111111','Assunto','Descrição']));
 assert.deepEqual(eventos,[]);
});


test('falha ao assumir papel não executa consulta e sempre libera conexão',async()=>{
 const eventos=[];
 const pool={async connect(){eventos.push('connect');return {
  async query(sql){eventos.push(sql);if(sql.startsWith('SET LOCAL ROLE'))throw Error('papel indisponível');return {rows:[]};},
  release(){eventos.push('release');}
 };}};
 const {executarCidadao}=criarExecutoresPostgres({pool});
 await assert.rejects(executarCidadao('SELECT * FROM mandato_testes.consulta_segura($1,$2)',['FICTICIO','a'.repeat(64)]),/papel indisponível/);
 assert.ok(eventos.includes('ROLLBACK'));
 assert.equal(eventos.at(-1),'release');
 assert.equal(eventos.some(sql=>sql.startsWith('SELECT * FROM mandato_testes.')),false);
});

test('falha de conexão não permite execução de SQL nem fallback para outro papel',async()=>{
 let tentativas=0;
 const pool={async connect(){tentativas++;throw Error('conexão indisponível');}};
 const {executarCidadao}=criarExecutoresPostgres({pool});
 await assert.rejects(executarCidadao('SELECT * FROM mandato_testes.consulta_segura($1,$2)',['FICTICIO','a'.repeat(64)]),/conexão indisponível/);
 assert.equal(tentativas,1);
});
