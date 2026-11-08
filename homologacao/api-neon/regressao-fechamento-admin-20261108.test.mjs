import test from 'node:test';
import assert from 'node:assert/strict';
import {criarServidor} from './server.mjs';
import {iniciarHomologacao} from './iniciar-homologacao.mjs';

async function comServidor(config, fn) {
 const servidor=criarServidor(config);
 await new Promise(resolve=>servidor.listen(0,'127.0.0.1',resolve));
 try {await fn('http://127.0.0.1:'+servidor.address().port);}
 finally {await new Promise(resolve=>servidor.close(resolve));}
}

test('rotas administrativas e sintéticas falham fechadas sem credenciais nem dependências',async()=>{
 let chamadas=0;
 await comServidor({operacoes:{decidir:async()=>{chamadas++;},listar:async()=>{chamadas++;}},
 registrarDecisaoSintetica:async()=>{chamadas++;}},async base=>{
  for(const [rota,metodo,corpo] of [
   ['/api/admin/recuperacoes','GET',undefined],
   ['/api/admin/recuperacoes/1/decisao','POST','{}'],
   ['/api/homologacao/decisao-sintetica-900007','POST','{}']
  ]){
   const resposta=await fetch(base+rota,{method:metodo,
    headers:{Authorization:'Bearer token-ficticio','Content-Type':'application/json'},body:corpo});
   assert.equal(resposta.status,403,rota);
  }
 });
 assert.equal(chamadas,0);
});

test('identidade não confirmada bloqueia decisão apesar de administrador autenticado',async()=>{
 let chamadas=0;
 await comServidor({verificarAdmin:async()=>true,verificarIdentidade:async()=>false,
 operacoes:{decidir:async()=>{chamadas++;return {ok:true};}}},async base=>{
  const resposta=await fetch(base+'/api/admin/recuperacoes/1/decisao',{
   method:'POST',headers:{Authorization:'Bearer token-ficticio','Content-Type':'application/json'},
   body:JSON.stringify({aprovar:true})});
  assert.equal(resposta.status,403);
 });
 assert.equal(chamadas,0);
});

test('inicialização recusa homologação desabilitada antes de conectar ao banco',async()=>{
 let conexoes=0;
 const carregarPg=async()=>{conexoes++;throw Error('nao deveria carregar driver');};
 await assert.rejects(iniciarHomologacao({env:{MANDATO_AMBIENTE:'homologacao',HABILITAR_API_NEON:'nao'},carregarPg}),/API desabilitada/);
 assert.equal(conexoes,0);
});
