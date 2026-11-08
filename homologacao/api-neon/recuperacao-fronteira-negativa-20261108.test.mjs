import {test} from 'node:test';
import assert from 'node:assert/strict';
import {criarServidor} from './server.mjs';

async function comServidor(opcoes, executar) {
 const servidor=criarServidor(opcoes);
 await new Promise(resolve=>servidor.listen(0,'127.0.0.1',resolve));
 try { await executar('http://127.0.0.1:'+servidor.address().port); }
 finally { await new Promise(resolve=>servidor.close(resolve)); }
}
test('métodos não permitidos não acionam MFA nem recuperação',async()=>{
 let mfa=0, operacoes=0, admin=0;
 await comServidor({
  verificarAdmin:async()=>{admin++;return true;},
  verificarMfaOperacao:async()=>{mfa++;return true;},
  concluirRecuperacao:async()=>{operacoes++;return {ok:true};}
 },async base=>{
  for(const method of ['GET','PUT','DELETE','PATCH']){
   const r=await fetch(base+'/api/admin/chaves/concluir-recuperacao',{method,headers:{Authorization:'Bearer teste-sintetico'}});
   assert.equal(r.status,404);
   assert.equal(r.headers.get('cache-control'),'no-store');
  }
 });
 assert.equal(admin,0);assert.equal(mfa,0);assert.equal(operacoes,0);
});
test('origem não autorizada bloqueia antes de autenticar ou executar recuperação',async()=>{
 let admin=0,mfa=0,operacoes=0;
 await comServidor({
  origensPermitidas:['https://homologacao.exemplo.invalid'],
  verificarAdmin:async()=>{admin++;return true;},
  verificarMfaOperacao:async()=>{mfa++;return true;},
  concluirRecuperacao:async()=>{operacoes++;return {ok:true};}
 },async base=>{
  const r=await fetch(base+'/api/admin/chaves/concluir-recuperacao',{
   method:'POST',headers:{Origin:'https://externo.exemplo.invalid',Authorization:'Bearer teste-sintetico','Content-Type':'application/json'},
   body:'{}'
  });
  assert.equal(r.status,403);
  assert.equal(r.headers.get('access-control-allow-origin'),null);
 });
 assert.equal(admin,0);assert.equal(mfa,0);assert.equal(operacoes,0);
});
