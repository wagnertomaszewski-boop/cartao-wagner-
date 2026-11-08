import test from 'node:test';
import assert from 'node:assert/strict';
import {protegerOperacaoComMfa} from './proteger-operacao-mfa.mjs';
const uid='123e4567-e89b-42d3-a456-426614174000';
test('MFA validado permite operação com identidade derivada da sessão',async()=>{
 let chamadas=0;
 const fn=protegerOperacaoComMfa({resolverOperador:async()=>uid,verificarMfa:async()=>({confirmado:true,operadorId:uid,confirmadoEm:1000}),executar:async p=>{chamadas++;return {ok:true,id:p.operadorId};}});
 assert.deepEqual(await fn({token:'sessao',dados:{operadorId:'falso'}}),{ok:true,id:uid});
 assert.equal(chamadas,1);
});
test('sem MFA, sessão ou com identidade divergente não executa',async()=>{
 let chamadas=0;
 const executar=async()=>{chamadas++;return {ok:true};};
 const a=protegerOperacaoComMfa({resolverOperador:async()=>uid,verificarMfa:async()=>({confirmado:false}),executar});
 const b=protegerOperacaoComMfa({resolverOperador:async()=>null,verificarMfa:async()=>({confirmado:true,operadorId:uid,confirmadoEm:1000}),executar});
 const c=protegerOperacaoComMfa({resolverOperador:async()=>uid,verificarMfa:async()=>({confirmado:true,operadorId:'outro',confirmadoEm:1000}),executar});
 assert.equal((await a({token:'sessao'})).autorizado,false);
 assert.equal((await b({token:'sessao'})).autorizado,false);
 assert.equal((await c({token:'sessao'})).autorizado,false);
 assert.equal(chamadas,0);
});
test('falha de autenticação nega acesso sem executar',async()=>{
 let chamadas=0;
 const fn=protegerOperacaoComMfa({resolverOperador:async()=>{throw Error('auth');},verificarMfa:async()=>true,executar:async()=>{chamadas++;}});
 assert.equal((await fn({token:'sessao'})).autorizado,false);
 assert.equal(chamadas,0);
});
