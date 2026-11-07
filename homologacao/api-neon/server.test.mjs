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
