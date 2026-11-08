import { test } from 'node:test';
import assert from 'node:assert/strict';
import { criarServidor } from './server.mjs';

// Testes HTTP locais: nenhuma conexão com Neon ou Supabase.
async function comServidor(opcoes, fn) {
  const servidor = criarServidor(opcoes);
  await new Promise(resolve => servidor.listen(0, '127.0.0.1', resolve));
  try { await fn('http://127.0.0.1:' + servidor.address().port); }
  finally { await new Promise(resolve => servidor.close(resolve)); }
}

test('preflight de origem permitida não chama autenticação nem operações administrativas', async () => {
  let autenticacoes = 0, operacoes = 0;
  await comServidor({
    origensPermitidas: ['https://painel-homologacao.example'],
    verificarAdmin: async () => { autenticacoes++; return true; },
    operacoes: { listar: async () => { operacoes++; return []; } }
  }, async base => {
    const resposta = await fetch(base + '/api/admin/recuperacoes', {
      method: 'OPTIONS',
      headers: {
        Origin: 'https://painel-homologacao.example',
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'Authorization'
      }
    });
    assert.equal(resposta.status, 204);
    assert.equal(resposta.headers.get('access-control-allow-origin'), 'https://painel-homologacao.example');
    assert.equal(autenticacoes, 0);
    assert.equal(operacoes, 0);
  });
});

test('preflight de origem não autorizada não chama autenticação nem operações', async () => {
  let autenticacoes = 0, operacoes = 0;
  await comServidor({
    origensPermitidas: ['https://painel-homologacao.example'],
    verificarAdmin: async () => { autenticacoes++; return true; },
    operacoes: { listar: async () => { operacoes++; return []; } }
  }, async base => {
    const resposta = await fetch(base + '/api/admin/recuperacoes', {
      method: 'OPTIONS', headers: { Origin: 'https://externo.example', 'Access-Control-Request-Method': 'GET' }
    });
    assert.equal(resposta.status, 403);
    assert.equal(resposta.headers.get('access-control-allow-origin'), null);
    assert.equal(autenticacoes, 0);
    assert.equal(operacoes, 0);
  });
});

test('tokens com espaços ou esquema incorreto são recusados antes do verificador', async () => {
  let autenticacoes = 0, operacoes = 0;
  await comServidor({
    verificarAdmin: async () => { autenticacoes++; return true; },
    operacoes: { listar: async () => { operacoes++; return []; } }
  }, async base => {
    for (const valor of ['Basic abc', 'Bearer ', 'Bearer abc def', 'bearer abc', 'Bearer abc\\tdef']) {
      const resposta = await fetch(base + '/api/admin/recuperacoes', { headers: { Authorization: valor } });
      assert.equal(resposta.status, 401, valor);
    }
    assert.equal(autenticacoes, 0);
    assert.equal(operacoes, 0);
  });
});
