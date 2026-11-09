import { test } from 'node:test';
import assert from 'node:assert/strict';
import { criarServidor } from './server.mjs';

// Testes locais: sem Neon, sem credenciais, sem dados de cidadãos.
async function comServidor(opcoes, executar) {
  const servidor = criarServidor(opcoes);
  await new Promise(resolve => servidor.listen(0, '127.0.0.1', resolve));
  try { await executar('http://127.0.0.1:' + servidor.address().port); }
  finally { await new Promise(resolve => servidor.close(resolve)); }
}
const rota = '/api/admin/chaves/concluir-recuperacao';
const cabecalhos = { Authorization: 'Bearer token-sintetico', 'Content-Type': 'application/json' };

test('tipo de conteúdo não JSON impede recuperação mesmo com admin e MFA válidos', async () => {
  let chamadas = 0;
  await comServidor({
    verificarAdmin: async () => true,
    verificarMfaOperacao: async () => true,
    concluirRecuperacao: async () => { chamadas++; return {ok:true}; }
  }, async base => {
    const resposta = await fetch(base + rota, {
      method: 'POST',
      headers: {...cabecalhos, 'Content-Type':'text/plain'},
      body:'{}'
    });
    assert.equal(resposta.status, 415);
    assert.equal(resposta.headers.get('cache-control'), 'no-store');
  });
  assert.equal(chamadas, 0);
});

test('JSON em formato de lista não aciona recuperação', async () => {
  let chamadas = 0;
  await comServidor({
    verificarAdmin: async () => true,
    verificarMfaOperacao: async () => true,
    concluirRecuperacao: async () => { chamadas++; return {ok:true}; }
  }, async base => {
    const resposta = await fetch(base + rota, {
      method: 'POST', headers: cabecalhos, body:'[]'
    });
    assert.equal(resposta.status, 400);
  });
  assert.equal(chamadas, 0);
});

test('corpo acima de 4096 bytes não aciona recuperação', async () => {
  let chamadas = 0;
  await comServidor({
    verificarAdmin: async () => true,
    verificarMfaOperacao: async () => true,
    concluirRecuperacao: async () => { chamadas++; return {ok:true}; }
  }, async base => {
    const resposta = await fetch(base + rota, {
      method: 'POST', headers: cabecalhos,
      body: JSON.stringify({texto:'x'.repeat(5000)})
    });
    assert.equal(resposta.status, 413);
  });
  assert.equal(chamadas, 0);
});
