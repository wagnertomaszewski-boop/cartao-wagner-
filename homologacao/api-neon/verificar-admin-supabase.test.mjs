import {test} from 'node:test';
import assert from 'node:assert/strict';
import {criarVerificadorAdmin} from './verificar-admin-supabase.mjs';
const uid='12345678-1234-1234-1234-123456789abc';
const cfg={supabaseUrl:'https://pmmsdjozyyxkbuqlkfpb.supabase.co',chavePublica:'sb_publishable_TESTE',idsPermitidos:[uid]};
const token='token-ficticio-com-mais-de-vinte-caracteres';
test('autoriza apenas sessão validada remotamente com UID permitido',async()=>{
 let requisicoes=0;
 const verificar=criarVerificadorAdmin({...cfg,buscar:async(url,opcoes)=>{
  requisicoes++;
  assert.equal(url,cfg.supabaseUrl+'/auth/v1/user');
  assert.equal(opcoes.headers.Authorization,'Bearer '+token);
  return {ok:true,json:async()=>({id:uid,aud:'authenticated',is_anonymous:false})};
 }});
 assert.equal(await verificar(token),true);
 assert.equal(requisicoes,1);
});
test('nega UID diferente, anônimo, resposta inválida e token ausente',async()=>{
 for(const usuario of [{id:'99999999-9999-9999-9999-999999999999',aud:'authenticated'},{id:uid,aud:'authenticated',is_anonymous:true},{id:uid,aud:'anon'}]){
  const verificar=criarVerificadorAdmin({...cfg,buscar:async()=>({ok:true,json:async()=>usuario})});
  assert.equal(await verificar(token),false);
 }
 const verificar=criarVerificadorAdmin({...cfg,buscar:async()=>{throw Error('offline');}});
 assert.equal(await verificar(token),false);
 assert.equal(await verificar(''),false);
});
test('não aceita projeto externo nem lista vazia de administradores',()=>{
 assert.throws(()=>criarVerificadorAdmin({...cfg,supabaseUrl:'https://example.com'}));
 assert.throws(()=>criarVerificadorAdmin({...cfg,idsPermitidos:[]}));
});
