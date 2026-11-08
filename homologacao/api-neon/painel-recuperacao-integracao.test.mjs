import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const painel=await readFile(new URL('../../painel/index.html',import.meta.url),'utf8');

test('recuperação por solicitação permanece bloqueada até homologação',()=>{
 assert.match(painel,/data-recuperacao-homologacao="pendente"/);
 assert.match(painel,/Recuperação segura de acesso/);
 assert.match(painel,/Nenhuma chave será emitida ou revogada por esta tela/);
});

test('verificação de acesso usa sessão administrativa e somente consulta estado',()=>{
 const inicio=painel.indexOf('async function verificarRecuperacaoSolicitacao(');
 const fim=painel.indexOf('async function executarOperacaoChave(',inicio);
 assert.ok(inicio>0&&fim>inicio);
 const trecho=painel.slice(inicio,fim);
 assert.match(trecho,/obterSessaoValida\(\)/);
 assert.match(trecho,/\/api\/admin\/chaves\/estado/);
 assert.match(trecho,/method:'GET'/);
 assert.match(trecho,/Authorization:'Bearer '\+sessao\.access_token/);
 assert.doesNotMatch(trecho,/method:'POST'|concluir-recuperacao|iniciar-confirmacao|localStorage|senhaLogin/);
});

test('estado da recuperação vem do servidor e não libera operação pela interface',async()=>{
 const servidor=await readFile(new URL('./server.mjs',import.meta.url),'utf8');
 assert.match(servidor,/recuperacaoHabilitada:typeof iniciarRecuperacao==='function' && typeof concluirRecuperacao==='function'/);
 const inicio=painel.indexOf('async function verificarRecuperacaoSolicitacao(');
 const fim=painel.indexOf('async function executarOperacaoChave(',inicio);
 const trecho=painel.slice(inicio,fim);
 assert.match(trecho,/dados\.recuperacaoHabilitada===true/);
 assert.doesNotMatch(trecho,/method:'POST'|\/api\/admin\/chaves\/concluir-recuperacao/);
});
