import test from 'node:test';
import assert from 'node:assert/strict';
import {criarServidor} from './server.mjs';

async function requisitar(servidor, caminho, opcoes = {}) {
  await new Promise(resolve => servidor.listen(0, '127.0.0.1', resolve));
  try {
    const {port} = servidor.address();
    const resposta = await fetch(`http://127.0.0.1:${port}${caminho}`, opcoes);
    return {status: resposta.status, corpo: await resposta.json()};
  } finally {
    await new Promise((resolve, reject) => servidor.close(erro => erro ? reject(erro) : resolve()));
  }
}

test('cabecalho X-Forwarded-For nao substitui autenticacao administrativa', async () => {
  let chamadas = 0;
  const servidor = criarServidor({
    verificarAdmin: async () => { chamadas++; return false; },
    operacoes: {listar: async () => { throw Error('nao deveria executar'); }}
  });
  const resultado = await requisitar(servidor, '/api/admin/recuperacoes', {
    headers: {'Authorization': 'Bearer token-ficticio', 'X-Forwarded-For': '127.0.0.1'}
  });
  assert.equal(resultado.status, 403);
  assert.equal(chamadas, 1);
});

test('sem handler a API de consulta falha fechada e nao expõe detalhes internos', async () => {
  const resultado = await requisitar(criarServidor(), '/api/solicitacoes/consultar', {
    method: 'POST', headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({protocolo:'TESTE-000'})
  });
  assert.equal(resultado.status, 503);
  assert.deepEqual(resultado.corpo, {erro:'Integração com banco ainda não habilitada'});
});

test('rota administrativa nao aceita metodo POST na listagem', async () => {
  let chamadas = 0;
  const resultado = await requisitar(criarServidor({
    verificarAdmin: async () => { chamadas++; return true; },
    operacoes: {listar: async () => ({dados:[]})}
  }), '/api/admin/recuperacoes', {
    method:'POST', headers:{'Authorization':'Bearer token-ficticio','Content-Type':'application/json'},
    body:'{}'
  });
  assert.equal(resultado.status, 404);
  assert.equal(chamadas, 0);
});
