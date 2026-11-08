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
test('gravação exige sessão, PATCH autenticado e leitura independente', async () => {
  const start = painel.indexOf('async function salvarEncaminhamentoPrefeitura(');
  const end = painel.indexOf('\nasync function registrarHistoricoFiscalizacaoMandato(',start);
  assert.ok(start>=0 && end>start);
  const chamadas=[],avisos=[];
  let sessoes=0;
  const salvo={id:123,encaminhado_prefeitura_em:'2026-11-07',protocolo_prefeitura:'HML-TESTE'};
  const contexto=vm.createContext({
    Number,String,Error,encodeURIComponent,
    SUPABASE_URL:'https://backend-ficticio.invalid',SUPABASE_KEY:'chave-publica-ficticia',
    document:{getElementById:id=>({value:id.startsWith('encaminhado')?'2026-11-07':'HML-TESTE'})},
    dataHojeISO:()=> '2026-11-08',diasEntreDatasCivisMandato:dias,
    confirm:()=>true,alert:m=>avisos.push(m),mensagemDeErro:e=>e.message,
    obterSessaoValida:async()=>{sessoes++;return {access_token:'token-ficticio-de-teste'};},
    requisicao:async(url,opcoes)=>{chamadas.push({url,opcoes});return {ok:true,json:async()=>[salvo]};},
    carregarSolicitacoes:async()=>{},atualizarContadoresStatus:async()=>{}
  });
  vm.runInContext(painel.slice(start,end),contexto);
  const botao={disabled:false};await contexto.salvarEncaminhamentoPrefeitura(123,botao);
  assert.equal(sessoes,1);assert.equal(chamadas.length,2);
  assert.equal(chamadas[0].opcoes.method,'PATCH');
  assert.equal(chamadas[0].opcoes.headers.Prefer,'return=representation');
  assert.deepEqual(JSON.parse(chamadas[0].opcoes.body),{encaminhado_prefeitura_em:'2026-11-07',protocolo_prefeitura:'HML-TESTE'});
  // Fetch usa GET por padrão. Verifica o comportamento, sem exigir sintaxe redundante.
  assert.equal(chamadas[1].opcoes.method||'GET','GET');
  assert.match(chamadas[1].url,/select=id,encaminhado_prefeitura_em,protocolo_prefeitura/);
  for(const c of chamadas)assert.equal(c.opcoes.headers.Authorization,'Bearer token-ficticio-de-teste');
  assert.equal(botao.disabled,false);assert.ok(avisos.includes('Dados do encaminhamento salvos com sucesso.'));
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
