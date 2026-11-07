import {test} from 'node:test';
import assert from 'node:assert/strict';
import {criarServidor} from './server.mjs';
import {criarLimitador} from './limitador.mjs';

test('limita chamadas HTTP públicas e não executa handler após limite',async()=>{
 let chamadas=0;
 const servidor=criarServidor({limitador:criarLimitador({maximo:2,janelaMs:60000}),operacoes:{solicitar:async()=>{chamadas++;return {ok:true};}}});
 await new Promise(resolve=>servidor.listen(0,'127.0.0.1',resolve));
 try {
  const url='http://127.0.0.1:'+servidor.address().port+'/api/recuperacao/solicitar';
  const enviar=()=>fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({protocolo:'TESTE',whatsapp:'51999990001'})});
  assert.equal((await enviar()).status,200);
  assert.equal((await enviar()).status,200);
  assert.equal((await enviar()).status,429);
  assert.equal(chamadas,2);
 } finally {await new Promise(resolve=>servidor.close(resolve));}
});
