import {test} from 'node:test';
import assert from 'node:assert/strict';
import {criarServidor} from './server.mjs';

// Testes sintéticos de proteção HTTP: não enviam mensagens nem acessam bancos.
async function comServidor(config, executar) {
  const servidor = criarServidor(config);
  await new Promise(resolve => servidor.listen(0, '127.0.0.1', resolve));
  try { await executar('http://127.0.0.1:' + servidor.address().port); }
  finally { await new Promise(resolve => servidor.close(resolve)); }
}
const post = (base, rota, dados, token) => fetch(base + rota, {
  method:'POST',
  headers:{'Content-Type':'application/json', ...(token ? {Authorization:'Bearer ' + token} : {})},
  body:JSON.stringify(dados)
});

test('recuperação automática não está exposta antes de implementar confirmação do WhatsApp', async () => {
  await comServidor({}, async base => {
    for (const rota of ['/api/recuperacao/confirmar', '/api/recuperacao/enviar-codigo']) {
      const resposta = await post(base, rota, {protocolo:'FICTICIO-1', codigo:'123456'});
      assert.equal(resposta.status,404);
    }
  });
});

test('solicitação de recuperação sem integração retorna indisponível', async () => {
  await comServidor({}, async base => {
    const resposta = await post(base, '/api/recuperacao/solicitar', {protocolo:'FICTICIO-1'});
    assert.equal(resposta.status,503);
  });
});

test('decisão manual exige autenticação e identidade verificada no servidor', async () => {
  let decisoes=0;
  const operacoes={decidir:async()=>{decisoes++; return {ok:true};}};
  await comServidor({operacoes, verificarAdmin:async()=>true}, async base => {
    const rota='/api/admin/recuperacoes/17/decisao';
    assert.equal((await post(base,rota,{decisao:'aprovar'})).status,401);
    assert.equal((await post(base,rota,{decisao:'aprovar'},'token-ficticio')).status,403);
  });
  assert.equal(decisoes,0);
});

test('identidade confirmada sem permissão administrativa não aprova recuperação', async () => {
  let decisoes=0;
  await comServidor({
    verificarAdmin:async()=>false,
    verificarIdentidade:async()=>true,
    operacoes:{decidir:async()=>{decisoes++;return {ok:true};}}
  }, async base => {
    assert.equal((await post(base,'/api/admin/recuperacoes/17/decisao',{decisao:'aprovar'},'token-ficticio')).status,403);
  });
  assert.equal(decisoes,0);
});

test('cliente não consegue aprovar apenas declarando identidade no corpo', async () => {
  let decisoes=0;
  await comServidor({
    verificarAdmin:async()=>true,
    verificarIdentidade:async()=>false,
    operacoes:{decidir:async()=>{decisoes++;return {ok:true};}}
  }, async base => {
    const resposta=await post(base,'/api/admin/recuperacoes/17/decisao',
      {decisao:'aprovar',identidadeConfirmada:true,admin:true},'token-ficticio');
    assert.equal(resposta.status,403);
  });
  assert.equal(decisoes,0);
});
