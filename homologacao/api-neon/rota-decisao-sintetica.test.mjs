import test from 'node:test';
import assert from 'node:assert/strict';
import {criarServidor} from './server.mjs';
async function requisitar(servidor,token='token-ficticio'){
 await new Promise(resolve=>servidor.listen(0,'127.0.0.1',resolve));
 try{
  const url='http://127.0.0.1:'+servidor.address().port+'/api/homologacao/decisao-sintetica-900007';
  const r=await fetch(url,{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({protocolo:'LEGADO-EMISSAO-TESTE-900007',referenciaOperador:'OP-TESTE-900007',registroId:'REG-TESTE-900007',identidadeVerificada:true})});
  return {status:r.status,body:await r.json()};
 }finally{await new Promise(resolve=>servidor.close(resolve));}
}
test('rota sintética fica desabilitada por padrão',async()=>{
 const r=await requisitar(criarServidor({verificarAdmin:async()=>true}));
 assert.equal(r.status,503);
});
test('sem autenticação autorizada, não executa gravação',async()=>{
 let chamadas=0;
 const r=await requisitar(criarServidor({verificarAdmin:async()=>false,registrarDecisaoSintetica:async()=>{chamadas++;return {id:1}}}));
 assert.equal(r.status,403);assert.equal(chamadas,0);
});
test('rota opcional ignora flags de identidade do cliente e usa token autenticado',async()=>{
 let recebido;
 const r=await requisitar(criarServidor({verificarAdmin:async()=>true,registrarDecisaoSintetica:async args=>{recebido=args;return {id:1}}}));
 assert.equal(r.status,200);
 assert.deepEqual(recebido,{protocolo:'LEGADO-EMISSAO-TESTE-900007',referenciaOperador:'OP-TESTE-900007',registroId:'REG-TESTE-900007',tokenOperador:'token-ficticio'});
});
