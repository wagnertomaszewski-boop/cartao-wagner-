import { test } from 'node:test';
import assert from 'node:assert/strict';
import { criarServidor } from './server.mjs';

async function comServidor(opcoes, executar) {
 const servidor = criarServidor(opcoes);
 await new Promise(resolve => servidor.listen(0, '127.0.0.1', resolve));
 try { await executar('http://127.0.0.1:' + servidor.address().port); }
 finally { await new Promise(resolve => servidor.close(resolve)); }
}
const rota = '/api/admin/chaves/concluir-recuperacao';
const post = (base, body, token='admin-sintetico') => fetch(base + rota, {
 method:'POST', headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
 body:JSON.stringify(body)
});
test('recuperação não chama handler sem MFA verificado pelo servidor', async () => {
 let chamadas=0;
 await comServidor({verificarAdmin:async()=>true, concluirRecuperacao:async()=>{chamadas++;return {ok:true};}}, async base=>{
  const resposta=await post(base,{mfaConfirmado:true,confirmacaoWhatsapp:true});
  assert.equal(resposta.status,403);
  assert.equal(resposta.headers.get('cache-control'),'no-store');
  assert.deepEqual(await resposta.json(),{erro:'MFA administrativo obrigatório'});
 });
 assert.equal(chamadas,0);
});
test('MFA negado ou indisponível falha fechado',async()=>{
 for(const verificarMfaOperacao of [async()=>false,async()=>{throw Error('falha sintética');}]) {
  let chamadas=0;
  await comServidor({verificarAdmin:async()=>true,verificarMfaOperacao,concluirRecuperacao:async()=>{chamadas++;}},async base=>{
   assert.equal((await post(base,{})).status,403);
  });
  assert.equal(chamadas,0);
 }
});
test('sem autenticação administrativa não consulta MFA nem executa handler',async()=>{
 let mfa=0, chamadas=0;
 await comServidor({verificarAdmin:async()=>false,verificarMfaOperacao:async()=>{mfa++;return true;},concluirRecuperacao:async()=>{chamadas++;}},async base=>{
  assert.equal((await fetch(base+rota,{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})).status,401);
  assert.equal((await post(base,{})).status,403);
 });
 assert.equal(mfa,0);
 assert.equal(chamadas,0);
});
test('com MFA servidor verdadeiro, corpo inválido não executa recuperação',async()=>{
 let chamadas=0;
 await comServidor({verificarAdmin:async()=>true,verificarMfaOperacao:async()=>true,concluirRecuperacao:async()=>{chamadas++;}},async base=>{
  const resposta=await fetch(base+rota,{method:'POST',headers:{Authorization:'Bearer admin-sintetico','Content-Type':'application/json'},body:'['});
  assert.equal(resposta.status,400);
 });
 assert.equal(chamadas,0);
});
