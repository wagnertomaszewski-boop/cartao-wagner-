import {test} from 'node:test';
import assert from 'node:assert/strict';
import {criarServidor} from './server.mjs';

async function comServidor(opcoes, executar) {
  const servidor = criarServidor(opcoes);
  await new Promise(resolve => servidor.listen(0, '127.0.0.1', resolve));
  try { await executar('http://127.0.0.1:' + servidor.address().port); }
  finally { await new Promise(resolve => servidor.close(resolve)); }
}
const json = (body, headers = {}) => ({
  method: 'POST',
  headers: {'Content-Type':'application/json', ...headers},
  body: JSON.stringify(body)
});

test('falha no handler cidadão não expõe mensagem interna', async () => {
  await comServidor({operacoes:{consultar: async () => {throw Error('segredo-interno-ficticio');}}}, async base => {
    const resposta = await fetch(base + '/api/solicitacoes/consultar', json({protocolo:'ficticio'}));
    assert.equal(resposta.status, 503);
    const corpo = await resposta.text();
    assert.deepEqual(JSON.parse(corpo), {erro:'Operação indisponível'});
    assert.equal(corpo.includes('segredo-interno-ficticio'), false);
  });
});

test('autorização administrativa que lança erro falha fechada', async () => {
  let chamadas = 0;
  await comServidor({
    verificarAdmin: async () => {throw Error('servico-auth-ficticio-indisponivel');},
    operacoes:{listar:async()=>{chamadas++;return [];}}
  }, async base => {
    const resposta = await fetch(base + '/api/admin/recuperacoes', {
      headers:{Authorization:'Bearer token-ficticio'}
    });
    assert.equal(resposta.status, 403);
    assert.equal(chamadas, 0);
    assert.equal((await resposta.text()).includes('servico-auth-ficticio-indisponivel'), false);
  });
});

test('corpo não JSON, array e texto inválido são rejeitados antes da operação', async () => {
  let chamadas = 0;
  await comServidor({operacoes:{solicitar:async()=>{chamadas++;return {};}}}, async base => {
    const url = base + '/api/recuperacao/solicitar';
    assert.equal((await fetch(url,{method:'POST',headers:{'Content-Type':'text/plain'},body:'{}'})).status,415);
    assert.equal((await fetch(url,json([]))).status,400);
    assert.equal((await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:'{' })).status,400);
    assert.equal(chamadas,0);
  });
});

test('resposta de consulta tem no-store e nosniff, sem CORS para requisição sem Origin', async () => {
  await comServidor({operacoes:{consultar:async()=>({ok:true})}}, async base => {
    const resposta = await fetch(base+'/api/solicitacoes/consultar',json({protocolo:'ficticio'}));
    assert.equal(resposta.status,200);
    assert.equal(resposta.headers.get('cache-control'),'no-store');
    assert.equal(resposta.headers.get('x-content-type-options'),'nosniff');
    assert.equal(resposta.headers.get('access-control-allow-origin'),null);
  });
});
