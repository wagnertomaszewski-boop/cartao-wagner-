import {test} from 'node:test';
import assert from 'node:assert/strict';
import {criarServidor} from './server.mjs';

test('não aceita checkbox do navegador como prova de identidade',async()=>{
 let chamadas=0;
 const servidor=criarServidor({
  verificarAdmin:async()=>true,
  operacoes:{decidir:async()=>{chamadas++;return {aprovado:true};}}
 });
 await new Promise(resolve=>servidor.listen(0,'127.0.0.1',resolve));
 try {
  const resposta=await fetch('http://127.0.0.1:'+servidor.address().port+'/api/admin/recuperacoes/7/decisao',{
   method:'POST',headers:{Authorization:'Bearer TOKEN-TESTE','Content-Type':'application/json'},
   body:JSON.stringify({aprovar:true,identidadeConfirmada:true})
  });
  assert.equal(resposta.status,403);
  assert.equal(chamadas,0);
 }finally{await new Promise(resolve=>servidor.close(resolve));}
});
