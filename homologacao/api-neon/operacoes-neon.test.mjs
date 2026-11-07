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
 const ops=criarOperacoesNeon({executarCidadao:async(s,p)=>{if(s.includes('consulta_respostas_segura')||s.includes('consulta_historico_segura'))return [];sql=s;params=p;return [{status:'Recebido'}];},executarAdmin:async()=>[]});
 const r=await ops.consultar({dados:{protocolo:'TESTE-000001',chave:'a'.repeat(64)}});
 assert.deepEqual(r.resultado,[{status:'Recebido'}]);
 assert.deepEqual(r.respostas,[]);
 assert.deepEqual(r.historico,[]);
 assert.equal(sql,'SELECT * FROM mandato_testes.consulta_segura($1,$2)');
 assert.deepEqual(params,['TESTE-000001','a'.repeat(64)]);
});
test('servidor rejeita chave curta antes de consultar o banco',async()=>{
 let chamadas=0;
 const ops=criarOperacoesNeon({executarCidadao:async()=>{chamadas++;return [];},executarAdmin:async()=>[]});
 await assert.rejects(ops.consultar({dados:{protocolo:'TESTE-000001',chave:'curta'}}),/Dados inválidos/);
 assert.equal(chamadas,0);
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
  if(sql.includes('consulta_respostas_segura'))return [{texto:'Resposta de teste',criado_em:'2026-11-07',caminho_privado:'NÃO EXPOR'}];
  if(sql.includes('consulta_segura'))return [{assunto:'Teste',status:'Recebido'}];
  return [];
 },executarAdmin:async()=>[]});
 const r=await ops.consultar({dados:{protocolo:'TESTE-000001',chave:'a'.repeat(64)}});
 assert.deepEqual(r.respostas,[{texto:'Resposta de teste',criado_em:'2026-11-07'}]);
 assert.equal(chamadas.length,3);
 assert.equal(chamadas[1].sql,'SELECT * FROM mandato_testes.consulta_respostas_segura($1,$2)');
});
test('chave inválida não dispara consulta às respostas',async()=>{
 const chamadas=[];
 const ops=criarOperacoesNeon({executarCidadao:async(sql)=>{chamadas.push(sql);return [];},executarAdmin:async()=>[]});
 const r=await ops.consultar({dados:{protocolo:'TESTE-000001',chave:'x'.repeat(64)}});
 assert.deepEqual(r,{resultado:[],respostas:[],historico:[]});
 assert.equal(chamadas.length,1);
});

test('histórico seguro não expõe campos internos e exige chave válida',async()=>{
 const chamadas=[];
 const ops=criarOperacoesNeon({executarCidadao:async(sql)=>{
  chamadas.push(sql);
  if(sql.includes('consulta_segura'))return [{assunto:'Teste',status:'Em andamento'}];
  if(sql.includes('consulta_historico_segura'))return [{status:'Recebido',observacao:'Encaminhado',criado_em:'2026-11-07',solicitacao_id:99,nota_privada:'não exibir'}];
  return [];
 },executarAdmin:async()=>[]});
 const r=await ops.consultar({dados:{protocolo:'TESTE-000001',chave:'a'.repeat(64)}});
 assert.deepEqual(r.historico,[{status:'Recebido',observacao:'Encaminhado',criado_em:'2026-11-07'}]);
 assert.ok(chamadas.includes('SELECT * FROM mandato_testes.consulta_historico_segura($1,$2)'));
});
