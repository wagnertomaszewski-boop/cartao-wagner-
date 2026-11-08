import {test} from 'node:test';
import assert from 'node:assert/strict';
import {emitirChavePrivada} from './chaves-privadas.mjs';
import {criarOperacaoConsultaNeonRestrita} from './operacao-consulta-neon-restrita.mjs';
import {SQL_RPC_CONSULTA_HOMOLOGACAO} from './consulta-rpc-homologacao.mjs';
test('pool PostgreSQL executa apenas RPC parametrizada',async()=>{
 const {chave,hash}=emitirChavePrivada();
 let chamadas=0;
 const operacao=criarOperacaoConsultaNeonRestrita({pool:{query:async(sql,params)=>{
  chamadas++;
  assert.equal(sql,SQL_RPC_CONSULTA_HOMOLOGACAO);
  assert.deepEqual(params,['TESTE-900010',hash]);
  return {rows:[{assunto:'Teste',status:'Recebido',nome:'NÃO EXIBIR'}]};
 }}});
 assert.deepEqual(await operacao({dados:{protocolo:'TESTE-900010',chave}}),
  {resultado:[{assunto:'Teste',status:'Recebido'}],respostas:[],historico:[],anexos:[]});
 assert.equal(chamadas,1);
});
test('sem pool ou com chave inválida falha fechado',async()=>{
 assert.throws(()=>criarOperacaoConsultaNeonRestrita({}),/obrigatório/);
 let chamadas=0;
 const operacao=criarOperacaoConsultaNeonRestrita({pool:{query:async()=>{chamadas++;return {rows:[]};}}});
 await assert.rejects(operacao({dados:{protocolo:'TESTE-900010',chave:'invalida'}}),/inválidos/);
 assert.equal(chamadas,0);
});
