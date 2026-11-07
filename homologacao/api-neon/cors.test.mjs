import {test} from 'node:test';
import assert from 'node:assert/strict';
import {criarServidor} from './server.mjs';

test('CORS aceita somente origem cadastrada e preflight não chama operações',async()=>{
 let chamadas=0;
 const origem='https://wagnertomaszewski-boop.github.io';
 const servidor=criarServidor({origensPermitidas:[origem],operacoes:{solicitar:async()=>{chamadas++;return {ok:true};}}});
 await new Promise(resolve=>servidor.listen(0,'127.0.0.1',resolve));
 try{
  const url='http://127.0.0.1:'+servidor.address().port+'/api/recuperacao/solicitar';
  const preflight=await fetch(url,{method:'OPTIONS',headers:{Origin:origem,'Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'authorization,content-type'}});
  assert.equal(preflight.status,204);
  assert.equal(preflight.headers.get('access-control-allow-origin'),origem);
  assert.equal(chamadas,0);
  const ruim=await fetch(url,{method:'POST',headers:{Origin:'https://malicioso.example','Content-Type':'application/json'},body:'{}'});
  assert.equal(ruim.status,403);
  assert.equal(ruim.headers.get('access-control-allow-origin'),null);
  assert.equal(chamadas,0);
  const boa=await fetch(url,{method:'POST',headers:{Origin:origem,'Content-Type':'application/json'},body:'{}'});
  assert.equal(boa.status,200);
  assert.equal(boa.headers.get('access-control-allow-origin'),origem);
  assert.equal(chamadas,1);
 }finally{await new Promise(resolve=>servidor.close(resolve));}
});
