import test from 'node:test';
import assert from 'node:assert/strict';
import {criarOperacoesChavesPainel} from './operacoes-chaves-painel.mjs';
const token='token-administrativo-sintetico-123456';
const dados={solicitacaoId:'900020',atestado:'atestado-sintetico-de-identidade'};
function fixture(id='123e4567-e89b-42d3-a456-426614174000'){
 const chamadas=[];
 const operacoes=criarOperacoesChavesPainel({
  resolverOperador:async t=>{chamadas.push(['auth',t]);return id;},
  gestor:{
   emitir:async p=>{chamadas.push(['emitir',p]);return {emitida:true};},
   revogar:async p=>{chamadas.push(['revogar',p]);return {revogada:true};}
  }
 });
 return {operacoes,chamadas};
}
test('emissão usa identidade resolvida no servidor, não ID do navegador',async()=>{
 const {operacoes,chamadas}=fixture();
 assert.deepEqual(await operacoes.emitir({token,dados:{...dados,operadorId:'forjado'}}),{emitida:true});
 assert.equal(chamadas[1][1].operadorId,'123e4567-e89b-42d3-a456-426614174000');
 assert.equal(chamadas[1][1].contexto.origem,'painel');
});
test('revogação exige sessão autorizada',async()=>{
 const {operacoes,chamadas}=fixture(null);
 await assert.rejects(operacoes.revogar({token,dados}),/não autorizado/);
 assert.equal(chamadas.length,1);
});
test('sem atestado não consulta autenticação nem altera chave',async()=>{
 const {operacoes,chamadas}=fixture();
 await assert.rejects(operacoes.emitir({token,dados:{solicitacaoId:'900020'}}),/inválida/);
 assert.equal(chamadas.length,0);
});
test('token curto é negado antes da consulta administrativa',async()=>{
 const {operacoes,chamadas}=fixture();
 await assert.rejects(operacoes.revogar({token:'invalido',dados}),/Sessão inválida/);
 assert.equal(chamadas.length,0);
});
