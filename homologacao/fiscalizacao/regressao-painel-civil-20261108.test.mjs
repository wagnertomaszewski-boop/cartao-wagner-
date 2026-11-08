// Regressão isolada da fiscalização: não acessa banco, rede ou dados de cidadãos.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const painel = readFileSync(new URL('../../painel/index.html', import.meta.url), 'utf8');
const inicio = painel.indexOf('function diasEntreDatasCivisMandato(');
const fim = painel.indexOf('\nfunction diasDesdeEncaminhamentoMandato(', inicio);
assert.ok(inicio >= 0 && fim > inicio, 'Função de dias civis deve existir');
const contexto = vm.createContext({Date, Math});
vm.runInContext(painel.slice(inicio, fim), contexto);
const dias = contexto.diasEntreDatasCivisMandato;

test('alertas: limites exatos 30, 60, 90 e 180 dias', () => {
  for (const n of [29,30,59,60,89,90,179,180,181])
    assert.equal(dias('2026-01-01', new Date(Date.UTC(2026,0,1+n)).toISOString().slice(0,10)), n);
});
test('dias civis ignoram horário de verão e atravessam fevereiro bissexto', () => {
  assert.equal(dias('2024-02-28','2024-03-01'), 2);
  assert.equal(dias('2026-02-28','2026-03-01'), 1);
});
test('datas impossíveis e futuras são rejeitadas', () => {
  for (const data of ['2026-02-29','2026-13-01','2026-00-10','2026-04-31','invalida',''])
    assert.equal(dias(data,'2026-11-08'),-1,data);
  assert.equal(dias('2026-11-09','2026-11-08'),-1);
});
test('gravação exige sessão, PATCH autenticado e leitura independente', () => {
  const start = painel.indexOf('async function salvarEncaminhamentoPrefeitura(');
  const end = painel.indexOf('\nasync function registrarHistoricoFiscalizacaoMandato(',start);
  assert.ok(start>=0 && end>start);
  const fn=painel.slice(start,end);
  assert.match(fn,/await obterSessaoValida\(\)/);
  assert.match(fn,/method:\s*"PATCH"/);
  assert.match(fn,/"Authorization":\s*"Bearer "\s*\+\s*sessao\.access_token/);
  assert.match(fn,/"Prefer":\s*"return=representation"/);
  assert.match(fn,/method:\s*"GET"/);
  assert.match(fn,/protocolo_prefeitura/);
  assert.match(fn,/encaminhado_prefeitura_em/);
});
test('histórico exige autenticação e permanece separado da consulta pública', () => {
  const start=painel.indexOf('async function registrarHistoricoFiscalizacaoMandato(');
  const end=painel.indexOf('\nasync function consultarHistoricoFiscalizacaoMandato(',start);
  assert.ok(start>=0 && end>start);
  const fn=painel.slice(start,end);
  assert.match(fn,/await obterSessaoValida\(\)/);
  assert.match(fn,/solicitacoes_fiscalizacao_historico/);
  assert.doesNotMatch(fn,/DATABASE_URL|postgres:\/\//);
});
