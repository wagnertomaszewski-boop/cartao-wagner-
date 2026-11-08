import {test} from 'node:test';
import assert from 'node:assert/strict';
import {emitirChavePrivada} from './chaves-privadas.mjs';
import {criarConsultaRpcHomologacao,SQL_RPC_CONSULTA_HOMOLOGACAO} from './consulta-rpc-homologacao.mjs';

test('RPC restrita recebe somente protocolo e hash, nunca segredo',async()=>{
 const {chave,hash}=emitirChavePrivada();
 let chamadas=0;
 const consultar=criarConsultaRpcHomologacao({executar:async(sql,params)=>{
  chamadas++;
  assert.equal(sql,SQL_RPC_CONSULTA_HOMOLOGACAO);
  assert.equal(params[0],'TESTE-900010');
  assert.deepEqual(params[1],hash);
  assert.equal(sql.includes(chave),false);
  assert.doesNotMatch(sql,/JOIN|chaves_acompanhamento|public\.solicitacoes/i);
  return {rows:[{assunto:'Teste',status:'Recebido',whatsapp:'NÃO MOSTRAR'}]};
 }});
 assert.deepEqual(await consultar({protocolo:'TESTE-900010',chave}),[{assunto:'Teste',status:'Recebido'}]);
 assert.equal(chamadas,1);
});
test('entradas inválidas não acessam banco',async()=>{
 let chamadas=0;
 const consultar=criarConsultaRpcHomologacao({executar:async()=>{chamadas++;return {rows:[]};}});
 await assert.rejects(consultar({protocolo:'TESTE-900010',chave:'invalida'}),/inválidos/);
 await assert.rejects(consultar({protocolo:'TESTE-900010 OR 1=1',chave:emitirChavePrivada().chave}),/inválidos/);
 assert.equal(chamadas,0);
});
test('sem resultado retorna lista vazia',async()=>{
 const consultar=criarConsultaRpcHomologacao({executar:async()=>({rows:[]})});
 assert.deepEqual(await consultar({protocolo:'TESTE-900010',chave:emitirChavePrivada().chave}),[]);
});
test('falha de contrato do banco não revela dados',async()=>{
 const consultar=criarConsultaRpcHomologacao({executar:async()=>({rows:[{},{}]})});
 await assert.rejects(consultar({protocolo:'TESTE-900010',chave:emitirChavePrivada().chave}),/inválida/);
});
