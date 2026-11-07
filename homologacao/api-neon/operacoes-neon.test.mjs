import {test} from 'node:test';
import assert from 'node:assert/strict';
import {criarOperacoesNeon} from './operacoes-neon.mjs';

test('recuperação chama função parametrizada e não revela existência de protocolo', async()=>{
 const chamadas=[];
 const ops=criarOperacoesNeon({executarCidadao:async(sql,params)=>{chamadas.push({sql,params});return [];},executarAdmin:async()=>[]});
 const resposta=await ops.solicitar({dados:{protocolo:' TESTE-000001 ',whatsapp:'51999990001'}});
 assert.match(resposta.mensagem,/analisado/);
 assert.deepEqual(chamadas,[{sql:'SELECT mandato_testes.pedir_recuperacao($1,$2)',params:['TESTE-000001','51999990001']}]);
});
test('consulta usa chave como parâmetro, nunca interpolada em SQL',async()=>{
 let sql,params;
 const ops=criarOperacoesNeon({executarCidadao:async(s,p)=>{sql=s;params=p;return [{status:'Recebido'}];},executarAdmin:async()=>[]});
 const r=await ops.consultar({dados:{protocolo:'TESTE-000001',chave:'segredo-teste'}});
 assert.deepEqual(r.resultado,[{status:'Recebido'}]);
 assert.equal(sql,'SELECT * FROM mandato_testes.consulta_segura($1,$2)');
 assert.deepEqual(params,['TESTE-000001','segredo-teste']);
});
test('decisão valida pedido e usa executor administrativo separado',async()=>{
 let chamadas=0;
 const ops=criarOperacoesNeon({executarCidadao:async()=>{throw Error('papel incorreto');},executarAdmin:async(sql,params)=>{chamadas++;assert.equal(sql,'SELECT * FROM mandato_testes.decidir_recuperacao($1,$2)');assert.deepEqual(params,['12',false]);return [];}});
 await assert.rejects(ops.decidir({pedidoId:'12',dados:{aprovar:'sim'}}));
 await assert.rejects(ops.decidir({pedidoId:'12 OR 1=1',dados:{aprovar:false,identidadeConfirmada:true}}));
 await ops.decidir({pedidoId:'12',dados:{aprovar:false,identidadeConfirmada:true}});
 assert.equal(chamadas,1);
});

test('consulta protegida retorna respostas somente quando protocolo e chave são válidos',async()=>{
 const chamadas=[];
 const ops=criarOperacoesNeon({executarCidadao:async(sql,params)=>{
  chamadas.push({sql,params});
  if(sql.includes('consulta_segura'))return [{assunto:'Teste',status:'Recebido'}];
  if(sql.includes('consulta_respostas_segura'))return [{texto:'Resposta de teste',criado_em:'2026-11-07',caminho_privado:'NÃO EXPOR'}];
  return [];
 },executarAdmin:async()=>[]});
 const r=await ops.consultar({dados:{protocolo:'TESTE-000001',chave:'a'.repeat(64)}});
 assert.deepEqual(r.respostas,[{texto:'Resposta de teste',criado_em:'2026-11-07'}]);
 assert.equal(chamadas.length,2);
 assert.equal(chamadas[1].sql,'SELECT * FROM mandato_testes.consulta_respostas_segura($1,$2)');
});
test('chave inválida não dispara consulta às respostas',async()=>{
 const chamadas=[];
 const ops=criarOperacoesNeon({executarCidadao:async(sql)=>{chamadas.push(sql);return [];},executarAdmin:async()=>[]});
 const r=await ops.consultar({dados:{protocolo:'TESTE-000001',chave:'x'.repeat(64)}});
 assert.deepEqual(r,{resultado:[],respostas:[]});
 assert.equal(chamadas.length,1);
});
