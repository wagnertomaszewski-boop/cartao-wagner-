import {test} from 'node:test';
import assert from 'node:assert/strict';
import {criarServidor} from './server.mjs';

async function comServidor(opcoes, executar) {
 const servidor=criarServidor(opcoes);
 await new Promise(resolve=>servidor.listen(0,'127.0.0.1',resolve));
 try {await executar('http://127.0.0.1:'+servidor.address().port);}
 finally {await new Promise(resolve=>servidor.close(resolve));}
}

const rota='/api/admin/chaves/estado';
test('diagnóstico de recuperação não revela estado a anônimos ou não administradores',async()=>{
 let verificacoes=0;
 await comServidor({verificarAdmin:async token=>{verificacoes++;return token==='admin-sintetico';}},async base=>{
  const semToken=await fetch(base+rota);
  assert.equal(semToken.status,401);
  assert.equal(semToken.headers.get('cache-control'),'no-store');
  assert.equal((await fetch(base+rota,{headers:{Authorization:'Bearer visitante'}})).status,403);
  const valido=await fetch(base+rota,{headers:{Authorization:'Bearer admin-sintetico'}});
  assert.equal(valido.status,200);
  assert.deepEqual(await valido.json(),{emissaoHabilitada:false,revogacaoHabilitada:false,recuperacaoHabilitada:false,ambiente:'homologacao'});
  assert.equal(verificacoes,2);
 });
});

test('estado exige ambos handlers de recuperação e nunca os executa',async()=>{
 let chamadas=0;
 const handler=async()=>{chamadas++;throw Error('não executar');};
 for(const opcoes of [
  {iniciarRecuperacao:handler},
  {concluirRecuperacao:handler},
  {iniciarRecuperacao:handler,concluirRecuperacao:handler}
 ]){
  await comServidor({verificarAdmin:async()=>true,...opcoes},async base=>{
   const resposta=await fetch(base+rota,{headers:{Authorization:'Bearer admin-sintetico'}});
   assert.equal(resposta.status,200);
   const dados=await resposta.json();
   assert.equal(dados.recuperacaoHabilitada,typeof opcoes.iniciarRecuperacao==='function' && typeof opcoes.concluirRecuperacao==='function');
   assert.equal(dados.ambiente,'homologacao');
  });
 }
 assert.equal(chamadas,0);
});

test('origem externa é bloqueada antes da autenticação administrativa',async()=>{
 let chamadas=0;
 await comServidor({verificarAdmin:async()=>{chamadas++;return true;},origensPermitidas:['https://painel.exemplo.test']},async base=>{
  const negado=await fetch(base+rota,{headers:{Origin:'https://externo.exemplo.test',Authorization:'Bearer admin-sintetico'}});
  assert.equal(negado.status,403);
  assert.equal(negado.headers.get('access-control-allow-origin'),null);
  const permitido=await fetch(base+rota,{headers:{Origin:'https://painel.exemplo.test',Authorization:'Bearer admin-sintetico'}});
  assert.equal(permitido.status,200);
  assert.equal(permitido.headers.get('access-control-allow-origin'),'https://painel.exemplo.test');
 });
 assert.equal(chamadas,1);
});
