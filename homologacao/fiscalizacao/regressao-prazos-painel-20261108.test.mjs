// Teste estático e funcional isolado: node --test homologacao/fiscalizacao/regressao-prazos-painel.test.mjs
// Não conecta a Supabase/Neon, não modifica dados e não publica o painel.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const html=readFileSync(new URL('../../painel/index.html',import.meta.url),'utf8');
const inicio=html.indexOf('function diasEntreDatasCivisMandato(');
const fim=html.indexOf('function diasDesdeEncaminhamentoMandato(',inicio);
assert.ok(inicio>=0 && fim>inicio,'Função de datas não encontrada no painel');
const contexto=vm.createContext({});
vm.runInContext(html.slice(inicio,fim),contexto,{timeout:1000});
const dias=(data,hoje)=>contexto.diasEntreDatasCivisMandato(data,hoje);
test('datas civis: limites 30/60/90/180 dias e calendário',()=>{
 for(const n of [0,29,30,59,60,89,90,179,180,181]){
  const inicio=new Date(Date.UTC(2026,0,1));
  const fim=new Date(inicio.getTime()+n*86400000).toISOString().slice(0,10);
  assert.equal(dias('2026-01-01',fim),n);
 }
 assert.equal(dias('2024-02-28','2024-03-01'),2);
 assert.equal(dias('2026-02-28','2026-03-01'),1);
 assert.equal(dias('2026-02-30','2026-03-01'),-1);
 assert.equal(dias('2026-13-01','2026-03-01'),-1);
 assert.equal(dias('2026-11-09','2026-11-08'),-1);
});
test('faixas de alertas são exclusivas e não incluem solicitações concluídas',()=>{
 assert.match(html,/const faixas=\[30,60,90,180\]/);
 assert.match(html,/normalizar\(x\.status\)!==["']concluido["']/);
 assert.match(html,/dias\(x\)>=n && \(i===faixas\.length-1 \|\| dias\(x\)<faixas\[i\+1\]\)/);
 for(const [n,faixa] of [[29,-1],[30,30],[59,30],[60,60],[89,60],[90,90],[179,90],[180,180],[400,180]]){
  const faixas=[30,60,90,180];
  const atual=faixas.findLast(x=>n>=x)??-1;
  assert.equal(atual,faixa);
 }
});
test('gravação administrativa exige sessão e confirma persistência independentemente',()=>{
 const start=html.indexOf('async function salvarEncaminhamentoPrefeitura(');
 const end=html.indexOf('async function registrarHistoricoFiscalizacaoMandato(',start);
 assert.ok(start>=0&&end>start);
 const trecho=html.slice(start,end);
 assert.match(trecho,/obterSessaoValida\(\)/);
 assert.match(trecho,/method:"PATCH"/);
 assert.match(trecho,/Prefer:"return=representation"/);
 assert.match(trecho,/encaminhado_prefeitura_em:data,protocolo_prefeitura:protocolo/);
 assert.match(trecho,/const verificacao=await requisicao\(/);
 assert.match(trecho,/Authorization":"Bearer "\+sessao\.access_token/);
});
test('histórico administrativo exige sessão e não injeta credenciais Neon no navegador',()=>{
 for(const nome of ['registrarHistoricoFiscalizacaoMandato','consultarHistoricoFiscalizacaoMandato']){
  const inicio=html.indexOf('async function '+nome+'(');
  assert.ok(inicio>=0,nome);
  assert.match(html.slice(inicio,inicio+3000),/obterSessaoValida\(\)/);
 }
 assert.doesNotMatch(html,/DATABASE_URL\s*=|postgres(?:ql)?:\/\/[^\s"']+/i);
});
