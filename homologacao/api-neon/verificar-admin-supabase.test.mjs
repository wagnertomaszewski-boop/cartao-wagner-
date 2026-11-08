import {test} from 'node:test';
import assert from 'node:assert/strict';
import {criarVerificadorAdmin,criarResolvedorOperadorAdmin} from './verificar-admin-supabase.mjs';
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

test('nega URL com sufixo malicioso',()=>{assert.throws(()=>criarVerificadorAdmin({...cfg,supabaseUrl:'https://pmmsdjozyyxkbuqlkfpb.supabase.co.evil.com'}));});
test('token curto não dispara requisição',async()=>{let n=0;const verificar=criarVerificadorAdmin({...cfg,buscar:async()=>{n++;return {ok:true,json:async()=>({id:uid,aud:'authenticated'})};}});assert.equal(await verificar('curto'),false);assert.equal(n,0);});
test('envia autenticação somente ao endpoint fixo, sem redirecionar',async()=>{const verificar=criarVerificadorAdmin({...cfg,buscar:async(url,opcoes)=>{assert.equal(url,cfg.supabaseUrl+'/auth/v1/user');assert.equal(opcoes.redirect,'error');assert.equal(opcoes.method,'GET');return {ok:true,json:async()=>({id:uid,aud:'authenticated',is_anonymous:false})};}});assert.equal(await verificar(token),true);});
test('falha fechada diante de resposta HTTP não autorizada',async()=>{const verificar=criarVerificadorAdmin({...cfg,buscar:async()=>({ok:false})});assert.equal(await verificar(token),false);});

test('resolvedor administrativo usa uma única consulta Auth para retornar UID',async()=>{
 let chamadas=0;
 const resolver=criarResolvedorOperadorAdmin({...cfg,buscar:async(url,opcoes)=>{
  chamadas++;
  assert.equal(url,cfg.supabaseUrl+'/auth/v1/user');
  assert.equal(opcoes.headers.Authorization,'Bearer '+token);
  return {ok:true,json:async()=>({id:uid,aud:'authenticated',is_anonymous:false})};
 }});
 assert.equal(await resolver(token),uid);
 assert.equal(chamadas,1);
});
test('resolvedor administrativo nega UID divergente, conta anônima e rede indisponível',async()=>{
 for(const usuario of [{id:'99999999-9999-9999-9999-999999999999',aud:'authenticated'},{id:uid,aud:'authenticated',is_anonymous:true},{id:uid,aud:'anon'}]){
  const resolver=criarResolvedorOperadorAdmin({...cfg,buscar:async()=>({ok:true,json:async()=>usuario})});
  assert.equal(await resolver(token),null);
 }
 const resolver=criarResolvedorOperadorAdmin({...cfg,buscar:async()=>{throw Error('rede indisponível');}});
 assert.equal(await resolver(token),null);
 assert.equal(await resolver('curto'),null);
});
