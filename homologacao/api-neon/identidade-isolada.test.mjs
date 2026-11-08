import {test} from 'node:test';
import assert from 'node:assert/strict';
import {criarServidor} from './server.mjs';

test('verificador de identidade não recebe declaração controlada pelo navegador',async()=>{
 let argumentos,executou=false;
 const servidor=criarServidor({
  verificarAdmin:async()=>true,
  verificarIdentidade:async a=>{argumentos=a;return false;},
  operacoes:{decidir:async()=>{executou=true;return {};}}
 });
 await new Promise(resolve=>servidor.listen(0,'127.0.0.1',resolve));
 try{
  const resposta=await fetch('http://127.0.0.1:'+servidor.address().port+'/api/admin/recuperacoes/12/decisao',{
   method:'POST',headers:{Authorization:'Bearer token','Content-Type':'application/json'},
   body:JSON.stringify({aprovar:true,identidadeConfirmada:true})
  });
  assert.equal(resposta.status,403);
  assert.deepEqual(argumentos,{pedidoId:'12',token:'token'});
  assert.equal(executou,false);
 }finally{await new Promise(resolve=>servidor.close(resolve));}
});
