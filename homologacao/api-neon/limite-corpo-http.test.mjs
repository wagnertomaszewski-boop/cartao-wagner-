import {test} from 'node:test';
import assert from 'node:assert/strict';
import {criarServidor} from './server.mjs';

test('rejeita corpo acima de 4096 bytes sem chamar operação',async()=>{
 let chamadas=0;
 const servidor=criarServidor({operacoes:{consultar:async()=>{chamadas++;return {};}}});
 await new Promise(resolve=>servidor.listen(0,'127.0.0.1',resolve));
 try{
  const resposta=await fetch('http://127.0.0.1:'+servidor.address().port+'/api/solicitacoes/consultar',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({protocolo:'FICTICIO',chave:'a'.repeat(5000)})});
  assert.equal(resposta.status,413);
  assert.equal(chamadas,0);
 }finally{await new Promise(resolve=>servidor.close(resolve));}
});
test('corpo JSON pequeno continua funcionando',async()=>{
 let chamadas=0;
 const servidor=criarServidor({operacoes:{consultar:async()=>{chamadas++;return {ok:true};}}});
 await new Promise(resolve=>servidor.listen(0,'127.0.0.1',resolve));
 try{
  const resposta=await fetch('http://127.0.0.1:'+servidor.address().port+'/api/solicitacoes/consultar',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({protocolo:'FICTICIO',chave:'a'.repeat(64)})});
  assert.equal(resposta.status,200);
  assert.deepEqual(await resposta.json(),{ok:true});
  assert.equal(chamadas,1);
 }finally{await new Promise(resolve=>servidor.close(resolve));}
});

test('servidor limita tempo de requisição e cabeçalhos',()=>{
 const servidor=criarServidor();
 assert.equal(servidor.requestTimeout,10000);
 assert.equal(servidor.headersTimeout,5000);
 assert.equal(servidor.maxHeadersCount,64);
 servidor.close();
});

test('rota raiz retorna 404 sem indicar falha do health',async()=>{
 const servidor=criarServidor();
 await new Promise(resolve=>servidor.listen(0,'127.0.0.1',resolve));
 try{
  const base='http://127.0.0.1:'+servidor.address().port;
  const raiz=await fetch(base+'/');
  assert.equal(raiz.status,404);
  assert.deepEqual(await raiz.json(),{erro:'Rota não encontrada'});
  const health=await fetch(base+'/health');
  assert.equal(health.status,200);
  assert.deepEqual(await health.json(),{status:'ok',modo:'homologacao',rotasCidadaoHabilitadas:false});
 }finally{await new Promise(resolve=>servidor.close(resolve));}
});

test('rotas de cidadão desativadas não invocam operações',async()=>{
 const servidor=criarServidor();
 await new Promise(resolve=>servidor.listen(0,'127.0.0.1',resolve));
 try{
  const base='http://127.0.0.1:'+servidor.address().port;
  for(const rota of ['/api/solicitacoes/consultar','/api/recuperacao/solicitar']){
   const resposta=await fetch(base+rota,{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
   assert.equal(resposta.status,503);
   assert.deepEqual(await resposta.json(),{erro:'Integração com banco ainda não habilitada'});
  }
  const admin=await fetch(base+'/api/admin/recuperacoes');
  assert.equal(admin.status,401);
 }finally{await new Promise(resolve=>servidor.close(resolve));}
});
