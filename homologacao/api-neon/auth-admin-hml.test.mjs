import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {memoryAdapter} from 'better-auth/adapters/memory';
import {base32} from '@better-auth/utils/base32';
import {createOTP} from '@better-auth/utils/otp';
import {criarAuthAdminHml,exigirAdminMfa,validarConfigAuthHml,HML_HOST,HML_ORIGIN} from './auth-admin-hml.mjs';
const email='administrador-ficticio@example.invalid';
test('auth isolada rejeita Supabase, host divergente, proprietário e parâmetros SSL',()=>{
 const env={MANDATO_AMBIENTE:'homologacao',AUTH_HML_ORIGIN:HML_ORIGIN,AUTH_HML_DATABASE_URL:'postgresql://mandato_auth_hml:senha-ficticia@'+HML_HOST+'/neondb',AUTH_HML_SECRET:'S'.repeat(48),AUTH_HML_BOOTSTRAP_TOKEN:'B'.repeat(48),AUTH_HML_ADMIN_EMAIL:'wagner.tomaszewski@gmail.com'};
 assert.equal(validarConfigAuthHml(env).ssl.rejectUnauthorized,true);
 for(const u of ['postgresql://mandato_auth_hml:senha@pmmsdjozyyxkbuqlkfpb.supabase.co/neondb',env.AUTH_HML_DATABASE_URL.replace('mandato_auth_hml','neondb_owner'),env.AUTH_HML_DATABASE_URL+'?sslmode=disable'])assert.throws(()=>validarConfigAuthHml({...env,AUTH_HML_DATABASE_URL:u}));
 assert.throws(()=>validarConfigAuthHml({...env,MANDATO_AMBIENTE:'production'}));
});
test('senha + TOTP reais na biblioteca: sem sessão antes do segundo fator e rejeição de código incorreto',async()=>{
 const db={user:[],session:[],account:[],verification:[],twoFactor:[],rateLimit:[]};
 const auth=criarAuthAdminHml({database:memoryAdapter(db),secret:randomBytes(48).toString('hex'),origin:'http://localhost:8788',adminEmail:email,secure:false});
 const password=randomBytes(24).toString('hex');const jar=new Map();
 async function call(path,data){
  const req=new Request('http://localhost:8788/hml/auth'+path,{method:data===undefined?'GET':'POST',headers:{Origin:'http://localhost:8788',cookie:[...jar].map(([k,v])=>k+'='+v).join('; '),'Content-Type':'application/json'},body:data===undefined?undefined:JSON.stringify(data)});
  const r=await auth.handler(req);for(const c of r.headers.getSetCookie()){const s=c.split(';')[0],i=s.indexOf('=');jar.set(s.slice(0,i),s.slice(i+1));}return {status:r.status,data:await r.json()};
 }
 await auth.api.signUpEmail({body:{email,password,name:'Administrador fictício'}});
 await assert.rejects(auth.api.signUpEmail({body:{email:'intruso@example.invalid',password,name:'Intruso'}}));
 assert.equal((await call('/sign-in/email',{email,password})).status,200);
 const enable=await call('/two-factor/enable',{password});assert.equal(enable.status,200);
 const secret=base32.decode(new URL(enable.data.totpURI).searchParams.get('secret'));
 let code=await createOTP(secret,{digits:6,period:30}).totp();
 assert.equal((await call('/two-factor/verify-totp',{code})).status,200);
 await call('/sign-out',{});
 const login=await call('/sign-in/email',{email,password});assert.equal(login.data.twoFactorRedirect,true);
 assert.equal((await call('/get-session')).data,null);
 const wrong=code==='000000'?'111111':'000000';assert.equal((await call('/two-factor/verify-totp',{code:wrong})).status,401);
 code=await createOTP(secret,{digits:6,period:30}).totp();
 assert.equal((await call('/two-factor/verify-totp',{code})).status,200);
 const session=(await call('/get-session')).data;assert.equal(session.user.twoFactorEnabled,true);
 await call('/sign-out',{});assert.equal((await call('/get-session')).data,null);
});
test('operações exigem prova MFA recente vinculada à mesma sessão, não apenas cadastro de MFA',async()=>{
 const s={user:{id:'u',email,twoFactorEnabled:true},session:{id:'sessao1'}};
 const options={auth:{api:{getSession:async()=>s}},headers:new Headers(),adminEmail:email,agora:Date.now()};
 await assert.rejects(exigirAdminMfa({...options,pool:{query:async()=>({rows:[]})}}));
 await assert.rejects(exigirAdminMfa({...options,pool:{query:async()=>({rows:[{confirmado_em:new Date(options.agora-301000)}]})}}));
 const r=await exigirAdminMfa({...options,pool:{query:async(sql,args)=>{assert.deepEqual(args,['sessao1','u']);return {rows:[{confirmado_em:new Date(options.agora)}]};}}});assert.equal(r.sessaoId,'sessao1');
});
