import test from 'node:test';
import assert from 'node:assert/strict';
import {criarVerificadorReautenticacaoSupabase} from './reautenticacao-supabase.mjs';
const operadorId='123e4567-e89b-42d3-a456-426614174000',agora=1762600000000;
const token=(claims)=>'eyJhbGciOiJIUzI1NiJ9.'+Buffer.from(JSON.stringify(claims)).toString('base64url')+'.assinatura-do-teste';
const base={sub:operadorId,aal:'aal2',auth_time:Math.floor((agora-60000)/1000),exp:Math.floor((agora+60000)/1000)};
const criar=(buscar)=>criarVerificadorReautenticacaoSupabase({supabaseUrl:'https://pmmsdjozyyxkbuqlkfpb.supabase.co',chavePublica:'sb_publishable_teste',idsPermitidos:[operadorId],buscar,agora:()=>agora});
const autorizado=async()=>({ok:true,json:async()=>({id:operadorId,aud:'authenticated',is_anonymous:false})});
test('MFA aal2 e autenticação recente validadas no Auth',async()=>{
 const verificar=criar(autorizado);
 assert.equal((await verificar({operadorId,token:token(base)})).confirmado,true);
 for(const claims of [{...base,aal:'aal1'},{...base,auth_time:Math.floor((agora-301000)/1000)},{...base,exp:Math.floor((agora-1000)/1000)},{...base,sub:'outro'}])
  assert.equal((await verificar({operadorId,token:token(claims)})).confirmado,false);
});
test('nega token não reconhecido pelo Supabase e falhas de rede',async()=>{
 const negado=criar(async()=>({ok:false}));
 assert.equal((await negado({operadorId,token:token(base)})).confirmado,false);
 const falha=criar(async()=>{throw Error('indisponível')});
 assert.equal((await falha({operadorId,token:token(base)})).confirmado,false);
});
