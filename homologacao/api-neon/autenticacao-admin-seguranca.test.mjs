import test from 'node:test';
import assert from 'node:assert/strict';
import {criarServidor} from './server.mjs';
import {criarVerificadorAdmin} from './verificar-admin-supabase.mjs';

const UID='11111111-1111-4111-8111-111111111111';
const OUTRO='22222222-2222-4222-8222-222222222222';
const TOKEN='token-de-teste-comprido-sem-credencial-real';
function verificador(buscar){
 return criarVerificadorAdmin({
  supabaseUrl:'https://abcdefghijklmnopqrst.supabase.co',
  chavePublica:'sb_publishable_chave_ficticia',
  idsPermitidos:[UID],buscar
 });
}
test('validação de administrador rejeita sessão sem resposta válida, anônima ou não autorizada',async()=>{
 for(const usuario of [{id:OUTRO,aud:'authenticated',is_anonymous:false},{id:UID,aud:'anon',is_anonymous:false},{id:UID,aud:'authenticated',is_anonymous:true},{}]){
  const verificar=verificador(async()=>({ok:true,json:async()=>usuario}));
  assert.equal(await verificar(TOKEN),false);
 }
 const verificar=verificador(async()=>({ok:false}));
 assert.equal(await verificar(TOKEN),false);
 assert.equal(await verificar('curto'),false);
});
test('validação positiva exige UID autorizado e sessão autenticada verificada no servidor',async()=>{
 let chamadas=0;
 const verificar=verificador(async(url,opcoes)=>{
  chamadas++;
  assert.equal(url,'https://abcdefghijklmnopqrst.supabase.co/auth/v1/user');
  assert.equal(opcoes.headers.Authorization,'Bearer '+TOKEN);
  assert.equal(opcoes.redirect,'error');
  return {ok:true,json:async()=>({id:UID,aud:'authenticated',is_anonymous:false})};
 });
 assert.equal(await verificar(TOKEN),true);
 assert.equal(chamadas,1);
});
test('HTTP administrativo bloqueia tokens ausentes ou inválidos sem executar decisões',async()=>{
 let chamadas=0;
 const servidor=criarServidor({
  verificarAdmin:verificador(async()=>({ok:false})),
  verificarIdentidade:async()=>true,
  operacoes:{listar:async()=>{chamadas++;return [];},decidir:async()=>{chamadas++;return {ok:true};}}
 });
 await new Promise(resolve=>servidor.listen(0,'127.0.0.1',resolve));
 try{
  const base='http://127.0.0.1:'+servidor.address().port;
  assert.equal((await fetch(base+'/api/admin/recuperacoes')).status,401);
  assert.equal((await fetch(base+'/api/admin/recuperacoes',{headers:{Authorization:'Bearer '+TOKEN}})).status,403);
  assert.equal((await fetch(base+'/api/admin/recuperacoes/1/decisao',{method:'POST',headers:{Authorization:'Bearer '+TOKEN,'Content-Type':'application/json'},body:'{"aprovar":true}'})).status,403);
  assert.equal(chamadas,0);
 }finally{await new Promise(resolve=>servidor.close(resolve));}
});
test('decisão exige segunda confirmação no servidor mesmo com sessão autenticada',async()=>{
 let chamadas=0;
 const servidor=criarServidor({
  verificarAdmin:verificador(async()=>({ok:true,json:async()=>({id:UID,aud:'authenticated',is_anonymous:false})})),
  verificarIdentidade:async()=>false,
  operacoes:{decidir:async()=>{chamadas++;return {ok:true};}}
 });
 await new Promise(resolve=>servidor.listen(0,'127.0.0.1',resolve));
 try{
  const resposta=await fetch('http://127.0.0.1:'+servidor.address().port+'/api/admin/recuperacoes/1/decisao',{
   method:'POST',headers:{Authorization:'Bearer '+TOKEN,'Content-Type':'application/json'},body:'{"aprovar":true}'
  });
  assert.equal(resposta.status,403);
  assert.equal(chamadas,0);
 }finally{await new Promise(resolve=>servidor.close(resolve));}
});
