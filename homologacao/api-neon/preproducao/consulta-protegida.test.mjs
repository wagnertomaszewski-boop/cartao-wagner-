import test from 'node:test';
import assert from 'node:assert/strict';
import { criarConsultaProtegida } from './consulta-protegida.mjs';
import { criarChave, verificadorHmac } from './segredos-privados.mjs';
const segredo = 'segredo-sintetico-exclusivo-testes-mais-de-32-bytes';
const chave = criarChave();
const registro = { solicitacao_id: 42, segredo_verificador: verificadorHmac('key', chave, segredo), revogada_em: null };
const configurar = (limitarTentativas = async () => true) => criarConsultaProtegida({
  buscarPorProtocolo: async p => p === '2026-TESTE' ? registro : null,
  segredoServidor: segredo, limitarTentativas
});
test('sem chave não consulta nem busca no banco', async () => {
  let consultas = 0;
  const consultar = criarConsultaProtegida({buscarPorProtocolo:async()=>{consultas++;return registro;},segredoServidor:segredo,limitarTentativas:async()=>true});
  assert.deepEqual(await consultar({protocolo:'2026-TESTE'}),{autorizado:false});
  assert.equal(consultas,0);
});
test('chave correta libera somente identificador', async () => {
  assert.deepEqual(await configurar()({protocolo:'2026-TESTE',chave}),{autorizado:true,solicitacaoId:42});
});
test('chave errada, protocolo inexistente e revogação negam', async () => {
  const consultar = configurar();
  assert.deepEqual(await consultar({protocolo:'2026-TESTE',chave:criarChave()}),{autorizado:false});
  assert.deepEqual(await consultar({protocolo:'2026-OUTRO',chave}),{autorizado:false});
  registro.revogada_em = new Date().toISOString();
  try {assert.deepEqual(await consultar({protocolo:'2026-TESTE',chave}),{autorizado:false});}
  finally {registro.revogada_em=null;}
});
test('limitador nega por padrão e não consulta dados', async () => {
  let consultas=0;
  const consultar=criarConsultaProtegida({buscarPorProtocolo:async()=>{consultas++;return registro;},segredoServidor:segredo,limitarTentativas:async()=>false});
  assert.deepEqual(await consultar({protocolo:'2026-TESTE',chave}),{autorizado:false});
  assert.equal(consultas,0);
});

test('falha do limitador impede consulta ao banco', async () => {
  let consultas=0;
  const consultar=criarConsultaProtegida({buscarPorProtocolo:async()=>{consultas++;return registro;},segredoServidor:segredo,limitarTentativas:async()=>{throw new Error('indisponivel');}});
  assert.deepEqual(await consultar({protocolo:'2026-TESTE',chave}),{autorizado:false});
  assert.equal(consultas,0);
});
