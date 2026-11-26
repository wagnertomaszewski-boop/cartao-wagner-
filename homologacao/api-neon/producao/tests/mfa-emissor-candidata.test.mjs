import assert from 'node:assert/strict';
import test from 'node:test';
import {PROJETO} from '../web/configuracao.mjs';
import {criarMfaWeb} from '../web/mfa-web.mjs';

const id='00000000-0000-4000-8000-000000000001';
const config={projeto:PROJETO,chavePublica:'sb_publishable_ficticia',obterToken:async()=>'token-ficticio'};

test('mantém o TOTP verificado mesmo quando o rótulo antigo é Localhost 3000',async()=>{
 const caminhos=[];
 const mfa=criarMfaWeb({...config,buscar:async url=>{
  caminhos.push(new URL(url).pathname);
  return Response.json({factors:[{id,factor_type:'totp',status:'verified',friendly_name:'Localhost 3000'}]});
 }});
 assert.deepEqual(await mfa.preparar({confirmado:true}),{id,jaConfigurado:true});
 assert.deepEqual(caminhos,['/auth/v1/user']);
});

test('pede emissor Mandato em Ação apenas no novo cadastro',async()=>{
 const mfa=criarMfaWeb({...config,buscar:async (url,opcoes)=>{
  if(url.endsWith('/user'))return Response.json({factors:[]});
  assert.equal(opcoes.method,'POST');
  assert.deepEqual(JSON.parse(opcoes.body),{factor_type:'totp',friendly_name:'Painel do Mandato',issuer:'Mandato em Ação'});
  return Response.json({id,totp:{qr_code:'<svg></svg>',secret:'sintetico',uri:'sintetico'}});
 }});
 const r=await mfa.preparar({confirmado:true});
 assert.equal(r.jaConfigurado,false);
 assert.deepEqual(Object.keys(r).sort(),['id','imagem','jaConfigurado']);
});
