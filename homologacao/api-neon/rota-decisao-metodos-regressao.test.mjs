import {test} from 'node:test';
import assert from 'node:assert/strict';
import {criarServidor} from './server.mjs';

test('rota de decisão administrativa rejeita métodos diferentes de POST antes de chamar o handler', async () => {
  let chamadas = 0;
  let autenticacoes = 0;
  const servidor = criarServidor({
    verificarAdmin: async () => { autenticacoes++; return true; },
    verificarIdentidade: async () => true,
    operacoes: {decidir: async () => { chamadas++; return {erro: 'nao_deve_executar'}; }}
  });
  await new Promise(resolve => servidor.listen(0, '127.0.0.1', resolve));
  try {
    const url = 'http://127.0.0.1:' + servidor.address().port + '/api/admin/recuperacoes/42/decisao';
    for (const method of ['GET', 'PUT', 'PATCH', 'DELETE']) {
      const resposta = await fetch(url, {method, headers: {Authorization: 'Bearer ficticio'}});
      assert.equal(resposta.status, 404, method);
    }
    assert.equal(chamadas, 0);
    assert.equal(autenticacoes, 0);
  } finally {
    await new Promise(resolve => servidor.close(resolve));
  }
});
