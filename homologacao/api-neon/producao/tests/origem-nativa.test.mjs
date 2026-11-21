import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {criarHandlerProducao} from '../http.mjs';

const originWeb='https://wagnertomaszewski-boop.github.io';

test('cliente Android sem Origin usa API, mas não ganha permissão CORS no navegador',async()=>{
 let consultas=0,administradores=0;
 const repositorio={
  limitarEntrada:async()=>true,
  consultar:async d=>{consultas++;return {encontrado:d.protocolo==='FICTICIO'&&d.chave==='a'.repeat(43)};},
  listarRecuperacoes:async()=>{administradores++;return [];},
 };
 const handler=criarHandlerProducao({
  repositorio,
  resolverAdminMfa:async()=>({usuarioId:'operador-sintetico',mfaRecente:false}),
  origemApi:'https://api.exemplo.org'
 });
 const servidor=http.createServer(async(req,res)=>{
  if(!await handler(req,res)){res.writeHead(404);res.end();}
 });
 await new Promise(resolve=>servidor.listen(0,'127.0.0.1',resolve));
 try{
  const base='http://127.0.0.1:'+servidor.address().port+'/api/v1/';
  const consultar=(origin)=>{
   const headers={'Content-Type':'application/json'};
   if(origin!==undefined)headers.Origin=origin;
   return fetch(base+'solicitacoes/consultar',{
    method:'POST',headers,body:JSON.stringify({protocolo:'FICTICIO',chave:'a'.repeat(43)})
   });
  };
  const semOrigin=await consultar();
  assert.equal(semOrigin.status,200);
  assert.equal(semOrigin.headers.get('access-control-allow-origin'),null);
  assert.equal((await semOrigin.json()).encontrado,true);
  const originAceita=await consultar(originWeb);
  assert.equal(originAceita.status,200);
  assert.equal(originAceita.headers.get('access-control-allow-origin'),originWeb);
  for(const indevida of ['https://intruso.invalid','null','']){
   const resposta=await consultar(indevida);
   assert.equal(resposta.status,403);
   assert.equal(resposta.headers.get('access-control-allow-origin'),null);
  }
  assert.equal(consultas,2,'Origem indevida não alcança o repositório');
  const preflightSemOrigin=await fetch(base+'solicitacoes/consultar',{method:'OPTIONS'});
  assert.equal(preflightSemOrigin.status,403);
  const preflightWeb=await fetch(base+'solicitacoes/consultar',{
   method:'OPTIONS',headers:{Origin:originWeb,'Access-Control-Request-Method':'POST'}
  });
  assert.equal(preflightWeb.status,204);
  assert.equal(preflightWeb.headers.get('access-control-allow-origin'),originWeb);
  const adminSemToken=await fetch(base+'admin/recuperacao/listar',{
   method:'POST',headers:{'Content-Type':'application/json'},body:'{}'
  });
  assert.equal(adminSemToken.status,401);
  const adminSemMfa=await fetch(base+'admin/recuperacao/listar',{
   method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer token-sintetico'},body:'{}'
  });
  assert.equal(adminSemMfa.status,403);
  assert.equal(administradores,0,'Sem MFA, função administrativa não executa');
 }finally{
  await new Promise((resolve,reject)=>servidor.close(e=>e?reject(e):resolve()));
 }
});
