import {test} from 'node:test';
import assert from 'node:assert/strict';
import {criarServidor} from './server.mjs';

async function comServidor(opcoes, executar) {
  const server = criarServidor(opcoes);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try { await executar('http://127.0.0.1:' + server.address().port); }
  finally { await new Promise(resolve => server.close(resolve)); }
}
test('rotas administrativas exigem autenticação e autorização', async () => {
  const tokens = [];
  await comServidor({verificarAdmin: async token => {tokens.push(token); return token === 'admin-valido';}}, async base => {
    for (const [path,method] of [['/api/admin/recuperacoes','GET'], ['/api/admin/recuperacoes/123/decisao','POST']]) {
      assert.equal((await fetch(base+path,{method})).status,401);
      assert.equal((await fetch(base+path,{method,headers:{Authorization:'Bearer invalido'}})).status,403);
      assert.equal((await fetch(base+path,{method,headers:{Authorization:'Bearer admin-valido'}})).status,503);
    }
    assert.deepEqual(tokens,['invalido','admin-valido','invalido','admin-valido']);
  });
});
test('sem verificador configurado, nenhum token autoriza administrador',async()=>{
  await comServidor({},async base=>{
    assert.equal((await fetch(base+'/api/admin/recuperacoes',{headers:{Authorization:'Bearer qualquer'}})).status,403);
    assert.equal((await fetch(base+'/api/recuperacao/solicitar',{method:'POST'})).status,503);
    assert.equal((await fetch(base+'/api/solicitacoes/consultar',{method:'POST'})).status,503);
    assert.equal((await fetch(base+'/health')).status,200);
    assert.equal((await fetch(base+'/health',{headers:{Origin:'https://site-externo.com'}})).status,403);
  });
});

test('handler de homologação recebe JSON somente após validação e autenticação', async () => {
  let chamadas = 0;
  await comServidor({
    verificarAdmin: async token => token === 'autorizado',
    verificarIdentidade: async () => true,
    operacoes: { decidir: async ({dados,pedidoId}) => {chamadas++; return {pedidoId, aprovado: dados.aprovar};} }
  }, async base => {
    const url=base+'/api/admin/recuperacoes/15/decisao';
    const json={method:'POST',headers:{Authorization:'Bearer autorizado','Content-Type':'application/json'},body:JSON.stringify({aprovar:false})};
    assert.equal((await fetch(url,{...json,headers:{...json.headers,Authorization:'Bearer errado'}})).status,403);
    assert.equal((await fetch(url,{...json,body:'{'})).status,400);
    assert.equal((await fetch(url,{...json,body:JSON.stringify({texto:'x'.repeat(5000)})})).status,413);
    const ok=await fetch(url,json);
    assert.equal(ok.status,200);
    assert.deepEqual(await ok.json(),{pedidoId:'15',aprovado:false});
    assert.equal(chamadas,1);
  });
});

test('health indica apenas habilitação das rotas, sem alegar conexão com banco',async()=>{
 await comServidor({},async base=>{
  const resposta=await (await fetch(base+'/health')).json();
  assert.deepEqual(resposta,{status:'ok',modo:'homologacao',rotasCidadaoHabilitadas:false});
 });
 await comServidor({operacoes:{solicitar:async()=>({}),consultar:async()=>({})}},async base=>{
  const resposta=await (await fetch(base+'/health')).json();
  assert.equal(resposta.rotasCidadaoHabilitadas,true);
  assert.equal(resposta.modo,'homologacao');
 });
});
