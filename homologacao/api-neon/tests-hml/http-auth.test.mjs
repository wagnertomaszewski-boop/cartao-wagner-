import test from 'node:test';import assert from 'node:assert/strict';import http from 'node:http';
import {randomBytes} from 'node:crypto';import {readFile} from 'node:fs/promises';import {PGlite} from '@electric-sql/pglite';
import {createOTP} from '@better-auth/utils/otp';import {base32} from '@better-auth/utils/base32';
import {montar} from '../servidor-auth-hml.mjs';import {HML_ORIGIN} from '../auth-admin-hml.mjs';
test('HTTP com Postgres: login, cadastro TOTP, prova de sessão, aprovação auditada, CSRF, rotas restritas e logout',async()=>{
 const pg=new PGlite();await pg.exec(await readFile(new URL('../sql/auth-admin-hml.sql',import.meta.url),'utf8'));await pg.exec('SET search_path=auth_admin_hml');
 async function query(sql,params){try{const r=await pg.query(sql,params);return {...r,rowCount:r.affectedRows,command:sql.trim().split(' ')[0].toUpperCase()};}catch(e){throw e;}}
 const pool={query,connect:async()=>({query,release(){}}),end:async()=>{}};
 const env={AUTH_HML_ADMIN_EMAIL:'admin-http@example.invalid',AUTH_HML_SECRET:randomBytes(48).toString('hex'),AUTH_HML_BOOTSTRAP_TOKEN:randomBytes(48).toString('hex')};
 const hml=await montar({env,pool});const password=randomBytes(24).toString('hex');
 await hml.auth.api.signUpEmail({body:{email:env.AUTH_HML_ADMIN_EMAIL,name:'Operador fictício',password}});
 const server=http.createServer(async(req,res)=>{if(!await hml.handler(req,res)){res.writeHead(404);res.end();}});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const jar=new Map(),url='http://127.0.0.1:'+server.address().port;
 async function call(path,data,origin=HML_ORIGIN){const r=await fetch(url+'/hml'+path,{method:data===undefined?'GET':'POST',headers:{Origin:origin,'Content-Type':'application/json',cookie:[...jar].map(([k,v])=>k+'='+v).join('; ')},body:data===undefined?undefined:JSON.stringify(data)});for(const c of r.headers.getSetCookie()){const a=c.split(';')[0],i=a.indexOf('=');jar.set(a.slice(0,i),a.slice(i+1));}return {status:r.status,headers:r.headers,data:await r.json()};}
 try{
  assert.equal((await call('/api/pedidos',{})).status,401);
  assert.equal((await call('/auth/get-session')).data,null);
  assert.equal((await call('/auth/sign-up/email',{email:'intruso@example.invalid',password,name:'Intruso'})).status,404);
  assert.equal((await call('/auth/sign-in/email',{email:env.AUTH_HML_ADMIN_EMAIL,password},'https://site-nao-autorizado.invalid')).status,403);
  let r=await call('/auth/sign-in/email',{email:env.AUTH_HML_ADMIN_EMAIL,password});assert.equal(r.status,200);assert.equal('token' in r.data,false);
  assert.equal((await call('/api/pedidos',{})).status,401);
  r=await call('/auth/two-factor/enable',{password});assert.equal(r.status,200);assert.match(r.data.qr,/^data:image\/png;base64,/);
  const secret=base32.decode(new URL(r.data.totpURI).searchParams.get('secret'));const code=await createOTP(secret,{digits:6,period:30}).totp();
  r=await call('/auth/two-factor/verify-totp',{code,trustDevice:false});assert.equal(r.status,200);assert.equal('token' in r.data,false);
  assert.equal((await call('/api/estado')).data.mfaRecente,true);
  const p=(await call('/api/pedidos',{})).data;assert.ok(p.id);assert.equal((await call('/api/pedidos/'+p.id+'/aprovar',{})).data.aprovado,true);
  assert.equal((await call('/api/pedidos/'+p.id+'/iniciar',{})).status,503);
  assert.ok((await call('/api/auditoria')).data.eventos.some(e=>e.evento==='aprovacao_auditada'));
  await call('/auth/sign-out',{});assert.equal((await call('/api/pedidos',{})).status,401);
  r=await call('/auth/sign-in/email',{email:env.AUTH_HML_ADMIN_EMAIL,password});assert.equal(r.data.twoFactorRedirect,true);
  assert.equal((await call('/api/pedidos',{})).status,401);
  r=await call('/auth/two-factor/verify-totp',{code:await createOTP(secret,{digits:6,period:30}).totp(),trustDevice:false});assert.equal(r.status,200);
  assert.equal((await call('/api/estado')).data.mfaRecente,true);
 }finally{await new Promise(r=>server.close(r));await pg.close();}
});
