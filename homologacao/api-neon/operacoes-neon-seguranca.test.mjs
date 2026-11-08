import test from 'node:test';
import assert from 'node:assert/strict';
import {criarOperacoesNeon} from './operacoes-neon.mjs';

function montar() {
 const chamadas=[];
 const executarCidadao=async(sql,parametros)=>{
  chamadas.push({sql,parametros});
  if(sql.includes('consulta_segura')) return [{assunto:'Pedido fictício',status:'Em análise',dado_privado:'NÃO EXPOR'}];
  if(sql.includes('consulta_respostas_segura')) return [{texto:'Resposta de teste',criado_em:'2026-01-01',telefone:'NÃO EXPOR'}];
  if(sql.includes('consulta_nomes_anexos_segura')) return [{nome_arquivo:'arquivo-ficticio.pdf',url_interna:'NÃO EXPOR'}];
  if(sql.includes('consulta_historico_segura')) return [{status:'Em análise',observacao:'Recebido',criado_em:'2026-01-01',autor_id:123}];
  return [];
 };
 return {chamadas,operacoes:criarOperacoesNeon({executarCidadao,executarAdmin:async()=>[]})};
}
test('recuperação rejeita entradas inválidas sem consultar banco',async()=>{
 const {chamadas,operacoes}=montar();
 for(const dados of [{},{protocolo:'',whatsapp:'51999999999'},{protocolo:'X',whatsapp:'x'.repeat(26)}]){
  await assert.rejects(operacoes.solicitar({dados}),/Dados inválidos/);
 }
 assert.equal(chamadas.length,0);
});
test('recuperação devolve resposta neutra e usa SQL parametrizado',async()=>{
 const {chamadas,operacoes}=montar();
 const resposta=await operacoes.solicitar({dados:{protocolo:' TESTE ',whatsapp:' 51999999999 '}});
 assert.deepEqual(resposta,{mensagem:'Se os dados corresponderem, o pedido será analisado.'});
 assert.equal(chamadas.length,1);
 assert.equal(chamadas[0].sql,'SELECT mandato_testes.pedir_recuperacao($1,$2)');
 assert.deepEqual(chamadas[0].parametros,['TESTE','51999999999']);
});
test('consulta exige chave longa e não executa SQL com chave inválida',async()=>{
 const {chamadas,operacoes}=montar();
 for(const dados of [{protocolo:'TESTE',chave:'curta'},{protocolo:'',chave:'a'.repeat(64)},{protocolo:'TESTE',chave:'a'.repeat(129)}]){
  await assert.rejects(operacoes.consultar({dados}),/Dados inválidos/);
 }
 assert.equal(chamadas.length,0);
});
test('consulta retorna apenas campos permitidos e não vaza campos internos',async()=>{
 const {chamadas,operacoes}=montar();
 const resultado=await operacoes.consultar({dados:{protocolo:' TESTE ',chave:'a'.repeat(64)}});
 assert.deepEqual(resultado,{
  resultado:[{assunto:'Pedido fictício',status:'Em análise'}],
  respostas:[{texto:'Resposta de teste',criado_em:'2026-01-01'}],
  historico:[{status:'Em análise',observacao:'Recebido',criado_em:'2026-01-01'}],
  anexos:[{nome_arquivo:'arquivo-ficticio.pdf'}]
 });
 assert.equal(chamadas.length,4);
 for(const chamada of chamadas) assert.deepEqual(chamada.parametros,['TESTE','a'.repeat(64)]);
});
test('decisão administrativa rejeita ID e aprovação inválidos sem executar SQL',async()=>{
 const {chamadas,operacoes}=montar();
 for(const [pedidoId,dados] of [['0',{aprovar:true}],['1 OR 1=1',{aprovar:true}],['123',{aprovar:'sim'}]]){
  await assert.rejects(operacoes.decidir({pedidoId,dados}),/Decisão não autorizada/);
 }
 assert.equal(chamadas.length,0);
});
