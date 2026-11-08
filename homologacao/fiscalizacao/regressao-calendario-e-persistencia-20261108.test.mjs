import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';
import vm from 'node:vm';

// Testa a implementação real do painel, sem rede, banco ou credenciais.
const painel=readFileSync(resolve(dirname(fileURLToPath(import.meta.url)),'../../painel/index.html'),'utf8');
const inicio=painel.indexOf('function diasEntreDatasCivisMandato(');
const fim=painel.indexOf('\nfunction diasDesdeEncaminhamentoMandato(',inicio);
assert.ok(inicio>=0 && fim>inicio,'função de datas do painel não encontrada');
const contexto=vm.createContext({Date,Math});
vm.runInContext(painel.slice(inicio,fim),contexto,{timeout:1000});
const dias=(a,b)=>contexto.diasEntreDatasCivisMandato(a,b);

test('limites exatos de fiscalização 30/60/90/180 dias',()=>{
 for(const n of [30,60,90,180]){
  const data=new Date(Date.UTC(2026,0,1+n)).toISOString().slice(0,10);
  assert.equal(dias('2026-01-01',data),n);
 }
});

test('calendário civil, virada de ano e ano bissexto',()=>{
 assert.equal(dias('2024-02-28','2024-03-01'),2);
 assert.equal(dias('2025-12-31','2026-01-01'),1);
 assert.equal(dias('2026-11-08','2026-11-07'),-1);
});

test('datas inexistentes e formatos incorretos são rejeitados',()=>{
 for(const data of ['2026-02-29','2026-04-31','2026-13-01','2026-00-10','08/11/2026','2026-1-01','']){
  assert.equal(dias(data,'2026-11-08'),-1,data);
 }
});

test('gravação exige sessão e confirmação por leitura independente',()=>{
 const inicio=painel.indexOf('async function salvarEncaminhamentoPrefeitura(');
 const fim=painel.indexOf('\nasync function registrarHistoricoFiscalizacaoMandato(',inicio);
 assert.ok(inicio>=0&&fim>inicio);
 const trecho=painel.slice(inicio,fim);
 for(const exigencia of ['obterSessaoValida()','method:"PATCH"','Prefer":"return=representation"','&select=id,encaminhado_prefeitura_em,protocolo_prefeitura','"Cache-Control":"no-cache"','botao.disabled=true']){
  assert.ok(trecho.includes(exigencia),exigencia);
 }
 assert.ok(trecho.indexOf('method:"PATCH"')<trecho.indexOf('&select=id,encaminhado_prefeitura_em,protocolo_prefeitura'));
});

test('histórico exige sessão e não envia segredos PostgreSQL ao navegador',()=>{
 const inicio=painel.indexOf('async function registrarHistoricoFiscalizacaoMandato(');
 const fim=painel.indexOf('\nasync function consultarHistoricoFiscalizacaoMandato(',inicio);
 assert.ok(inicio>=0&&fim>inicio);
 const trecho=painel.slice(inicio,fim);
 assert.ok(trecho.includes('obterSessaoValida()'));
 assert.ok(!/DATABASE_URL|postgres(?:ql)?:\/\//i.test(painel));
});
