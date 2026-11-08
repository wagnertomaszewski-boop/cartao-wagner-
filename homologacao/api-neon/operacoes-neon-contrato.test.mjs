import {test} from 'node:test';
import assert from 'node:assert/strict';
import {criarOperacoesNeon} from './operacoes-neon.mjs';

// Testes locais de contrato do adaptador: nenhuma conexão externa ou dado real.
const criar = (cidadao = async () => [], admin = async () => []) =>
  criarOperacoesNeon({executarCidadao:cidadao, executarAdmin:admin});

test('adaptador falha fechado sem ambos executores do servidor', () => {
  assert.throws(() => criarOperacoesNeon(), /Executores autenticados/);
  assert.throws(() => criarOperacoesNeon({executarCidadao:async()=>[]}), /Executores autenticados/);
});

test('consulta rejeita chave curta e entradas malformadas antes de SQL', async () => {
  let chamadas=0;
  const ops=criar(async()=>{chamadas++;return [];});
  for (const dados of [
    {protocolo:'ABC',chave:'curta'},
    {protocolo:'ABC',chave:' '.repeat(32)},
    {protocolo:'',chave:'x'.repeat(32)},
    {protocolo:'A'.repeat(41),chave:'x'.repeat(32)},
    {protocolo:'ABC',chave:'x'.repeat(129)},
    {protocolo:123,chave:'x'.repeat(32)}
  ]) await assert.rejects(ops.consultar({dados}), /Dados inválidos/);
  assert.equal(chamadas,0);
});

test('consulta sem correspondência não executa consultas complementares', async () => {
  const chamadas=[];
  const ops=criar(async(sql,params)=>{chamadas.push({sql,params});return [];});
  const resultado=await ops.consultar({dados:{protocolo:' ABC ',chave:'z'.repeat(32)}});
  assert.deepEqual(resultado,{resultado:[],respostas:[],historico:[],anexos:[]});
  assert.equal(chamadas.length,1);
  assert.match(chamadas[0].sql,/mandato_testes\.consulta_segura\(\$1,\$2\)/);
  assert.deepEqual(chamadas[0].params,['ABC','z'.repeat(32)]);
});

test('consulta encontrada chama apenas funções parametrizadas e limita campos de saída', async () => {
  const chamadas=[];
  const linhas=[
    [{assunto:'Teste',status:'Em andamento',whatsapp:'NAO_EXIBIR',segredo_hash:'NAO_EXIBIR'}],
    [{texto:'Resposta fictícia',criado_em:'2026-01-01',dados_internos:'NAO_EXIBIR'}],
    [{nome_arquivo:'imagem.jpg',caminho_privado:'NAO_EXIBIR'}],
    [{status:'Em andamento',observacao:'Teste',criado_em:'2026-01-02',registrado_por:'NAO_EXIBIR'}]
  ];
  const ops=criar(async(sql,params)=>{chamadas.push({sql,params});return linhas[chamadas.length-1];});
  const chave='k'.repeat(32);
  const resultado=await ops.consultar({dados:{protocolo:'P-TESTE',chave}});
  assert.equal(chamadas.length,4);
  for(const {sql,params} of chamadas) {
    assert.match(sql,/^SELECT \* FROM mandato_testes\.[a-z_]+\(\$1,\$2\)$/);
    assert.deepEqual(params,['P-TESTE',chave]);
  }
  assert.deepEqual(resultado,{
    resultado:[{assunto:'Teste',status:'Em andamento'}],
    respostas:[{texto:'Resposta fictícia',criado_em:'2026-01-01'}],
    historico:[{status:'Em andamento',observacao:'Teste',criado_em:'2026-01-02'}],
    anexos:[{nome_arquivo:'imagem.jpg'}]
  });
  assert.equal(JSON.stringify(resultado).includes('NAO_EXIBIR'),false);
});

test('recuperação usa parâmetros e resposta neutra sem expor existência', async () => {
  const chamadas=[];
  const ops=criar(async(sql,params)=>{chamadas.push({sql,params});return [];});
  const dados={protocolo:' PROTO ',whatsapp:' 51999999999 '};
  const resposta=await ops.solicitar({dados});
  assert.deepEqual(chamadas,[{sql:'SELECT mandato_testes.pedir_recuperacao($1,$2)',params:['PROTO','51999999999']}]);
  assert.deepEqual(resposta,{mensagem:'Se os dados corresponderem, o pedido será analisado.'});
});

test('decisão administrativa valida id e booleano antes do executor', async () => {
  let chamadas=0;
  const ops=criar(async()=>[],async()=>{chamadas++;return [];});
  for(const pedidoId of ['0','-1','1 OR 1=1','1;DROP TABLE','9999999999999999999']) {
    await assert.rejects(ops.decidir({pedidoId,dados:{aprovar:true}}),/Decisão não autorizada/);
  }
  await assert.rejects(ops.decidir({pedidoId:'42',dados:{aprovar:'true'}}),/Decisão não autorizada/);
  assert.equal(chamadas,0);
  await ops.decidir({pedidoId:'42',dados:{aprovar:false}});
  assert.equal(chamadas,1);
});
