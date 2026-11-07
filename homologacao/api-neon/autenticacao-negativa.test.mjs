import {test} from 'node:test';
import assert from 'node:assert/strict';
import {criarServidor} from './server.mjs';

// Testes locais com identidades fictícias; não conectam ao Neon ou Supabase.
async function executarComServidor(configuracao, teste) {
 const servidor=criarServidor(configuracao);
 await new Promise((resolve,reject)=>{
  servidor.once('error',reject);
  servidor.listen(0,'127.0.0.1',resolve);
 });
 try {await teste('http://127.0.0.1:'+servidor.address().port);}
 finally {await new Promise((resolve,reject)=>servidor.close(erro=>erro?reject(erro):resolve()));}
}

test('token ausente ou malformado nunca chama o verificador administrativo',async()=>{
 let verificacoes=0, consultas=0;
 await executarComServidor({
  verificarAdmin:async()=>{verificacoes++;return true;},
  operacoes:{listar:async()=>{consultas++;return [];}}
 },async base=>{
  for(const authorization of [undefined,'','Bearer','Bearer ','Basic exemplo','Bearer token outro','bearer token']){
   const headers=authorization===undefined?{}:{Authorization:authorization};
   const resposta=await fetch(base+'/api/admin/recuperacoes',{headers});
   assert.equal(resposta.status,401,String(authorization));
  }
 });
 assert.equal(verificacoes,0);
 assert.equal(consultas,0);
});

test('erro no verificador administrativo falha fechado sem executar consulta',async()=>{
 let consultas=0;
 await executarComServidor({
  verificarAdmin:async()=>{throw Error('Falha fictícia de autenticação');},
  operacoes:{listar:async()=>{consultas++;return [];}}
 },async base=>{
  const resposta=await fetch(base+'/api/admin/recuperacoes',{headers:{Authorization:'Bearer token-ficticio'}});
  assert.equal(resposta.status,403);
  assert.deepEqual(await resposta.json(),{erro:'Acesso negado'});
 });
 assert.equal(consultas,0);
});

test('token válido não libera decisão sem confirmação independente de identidade',async()=>{
 let decisoes=0;
 await executarComServidor({
  verificarAdmin:async token=>token==='token-ficticio',
  operacoes:{decidir:async()=>{decisoes++;return {aprovado:true};}}
 },async base=>{
  const resposta=await fetch(base+'/api/admin/recuperacoes/7/decisao',{
   method:'POST',headers:{Authorization:'Bearer token-ficticio','Content-Type':'application/json'},
   body:JSON.stringify({aprovar:true,identidadeConfirmada:true})
  });
  assert.equal(resposta.status,403);
 });
 assert.equal(decisoes,0);
});
