import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {avaliarProntidaoConsulta} from '../preflight-consulta.mjs';

const estadoAtual={totalSolicitacoes:44,semProtocolo:3,protocolosDuplicados:0,chavesAtivas:0,funcoesLegadasPublicas:0,bucketRespostasPublico:false,papelBackendRestrito:false};
const validacoes={
 apiPrivadaImplantada:true,consultaChaveTestada:true,recuperacaoManualTestada:true,
 anexosPrivadosTestados:true,mfaPainelTestado:true,backupConfirmado:true,
 autorizacaoFinal:true,primeiroAcessoLegadoTestado:true
};
test('produção atual continua bloqueada mesmo após contenção de emergência',()=>{
 const r=avaliarProntidaoConsulta(estadoAtual,validacoes);
 assert.equal(r.pronto,false);
 assert.ok(r.bloqueadores.some(v=>v.includes('sem protocolo')));
 assert.ok(r.bloqueadores.some(v=>v.includes('privilégios mínimos')));
});
test('nenhum aceite pode ser presumido quando não foi comprovado',()=>{
 const inventario={...estadoAtual,semProtocolo:0,papelBackendRestrito:true};
 const r=avaliarProntidaoConsulta(inventario,{});
 assert.equal(r.pronto,false);
 assert.ok(r.bloqueadores.length>=7);
});
test('só libera com todos os pré-requisitos demonstrados',()=>{
 const inventario={...estadoAtual,semProtocolo:0,papelBackendRestrito:true,chavesAtivas:1};
 assert.equal(avaliarProntidaoConsulta(inventario,validacoes).pronto,true);
 assert.equal(avaliarProntidaoConsulta({...inventario,funcoesLegadasPublicas:1},validacoes).pronto,false);
 assert.equal(avaliarProntidaoConsulta({...inventario,bucketRespostasPublico:true},validacoes).pronto,false);
 assert.equal(avaliarProntidaoConsulta({...inventario,protocolosDuplicados:1},validacoes).pronto,false);
});
test('nunca aceita inventário parcial, valores negativos ou inventados',()=>{
 assert.throws(()=>avaliarProntidaoConsulta({},validacoes),/Inventário incompleto/);
 assert.throws(()=>avaliarProntidaoConsulta({...estadoAtual,semProtocolo:-1},validacoes),/Inventário incompleto/);
 assert.throws(()=>avaliarProntidaoConsulta({...estadoAtual,bucketRespostasPublico:null},validacoes),/permissões incompleto/);
});
test('tela fictícia oferece primeiro acesso, sem abrir protocolo isolado',async()=>{
 const html=await readFile(new URL('../../telas/v2/recuperar-acesso.html',import.meta.url),'utf8');
 const js=await readFile(new URL('../../telas/v2/seguranca/tela-recuperacao-manual.mjs',import.meta.url),'utf8');
 const candidato=await readFile(new URL('../web/tela.mjs',import.meta.url),'utf8');
 assert.match(html,/Primeiro acesso ou perdi minha chave/);
 assert.match(html,/nunca recebeu uma chave/);
 assert.match(html,/protocolo.*chave de acompanhamento/);
 assert.match(js,/api\.solicitar\(\{\.\.\.d,autorizado:d\.autorizado==='on'\}\)/);
 assert.match(js,/api\.validar\(/);
 assert.match(candidato,/Primeiro acesso ou perdi minha chave/);
 assert.doesNotMatch(candidato,/consulta_publica_protocolo/);
});
test('inventário SQL é somente leitura e não retorna identificadores de cidadãos',async()=>{
 const sql=await readFile(new URL('../sql/preflight-retomada-consulta-SOMENTE-LEITURA.sql',import.meta.url),'utf8');
 assert.match(sql,/SELECT[\s\S]+funcoes_legadas_publicas/);
 assert.doesNotMatch(sql,/\b(UPDATE|DELETE|INSERT|TRUNCATE|ALTER|REVOKE|GRANT|CREATE)\s+(TABLE|ON|INTO|FROM|public\.|storage\.)/i);
 assert.doesNotMatch(sql,/SELECT\s+\*\s+FROM\s+public\.solicitacoes/i);
});
