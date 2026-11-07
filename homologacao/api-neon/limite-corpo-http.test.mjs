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
