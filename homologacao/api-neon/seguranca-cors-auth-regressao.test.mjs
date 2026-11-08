import {test} from 'node:test';
import assert from 'node:assert/strict';
import {criarServidor} from './server.mjs';

async function comServidor(opcoes, executar) {
  const servidor = criarServidor(opcoes);
  await new Promise(resolve => servidor.listen(0, '127.0.0.1', resolve));
  try { await executar('http://127.0.0.1:' + servidor.address().port); }
  finally { await new Promise(resolve => servidor.close(resolve)); }
}

test('origem externa bloqueada antes de autenticar e executar operação administrativa', async () => {
  let verificacoes = 0, operacoes = 0;
  await comServidor({
    origensPermitidas:['https://homologacao.exemplo.invalid'],
    verificarAdmin:async () => { verificacoes++; return true; },
    operacoes:{listar:async () => { operacoes++; return []; }}
  }, async base => {
    const resposta = await fetch(base+'/api/admin/recuperacoes', {
      headers:{Origin:'https://origem-nao-autorizada.invalid',Authorization:'Bearer token-ficticio'}
    });
    assert.equal(resposta.status,403);
    assert.equal(resposta.headers.get('access-control-allow-origin'),null);
    assert.equal(resposta.headers.get('cache-control'),'no-store');
    assert.equal(verificacoes,0);
    assert.equal(operacoes,0);
  });
});

test('preflight permitido não consulta autenticação nem executa operações',async () => {
  let verificacoes = 0, operacoes = 0;
  const origem = 'https://homologacao.exemplo.invalid';
  await comServidor({
    origensPermitidas:[origem],
    verificarAdmin:async () => { verificacoes++; return true; },
    operacoes:{listar:async () => { operacoes++; return []; }}
  },async base => {
    const resposta = await fetch(base+'/api/admin/recuperacoes',{
      method:'OPTIONS',headers:{Origin:origem,'Access-Control-Request-Method':'GET'}
    });
    assert.equal(resposta.status,204);
    assert.equal(resposta.headers.get('access-control-allow-origin'),origem);
    assert.equal(resposta.headers.get('cache-control'),'no-store');
    assert.equal(verificacoes,0);
    assert.equal(operacoes,0);
  });
});

test('token com espaços ou múltiplas credenciais é rejeitado antes do verificador',async () => {
  let verificacoes = 0, operacoes = 0;
  await comServidor({
    verificarAdmin:async () => { verificacoes++; return true; },
    operacoes:{listar:async () => { operacoes++; return []; }}
  },async base => {
    for (const token of ['Bearer a b','Bearer ','Basic teste','Bearer token\toutro']) {
      const resposta = await fetch(base+'/api/admin/recuperacoes',{headers:{Authorization:token}});
      assert.equal(resposta.status,401,token);
    }
    assert.equal(verificacoes,0);
    assert.equal(operacoes,0);
  });
});
