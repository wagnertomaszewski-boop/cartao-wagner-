// Execute com: node painel/tests/fiscalizacao-prazos.test.cjs
// Testa a função real do painel, extraída do HTML, sem rede nem dados de cidadãos.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function trecho(inicio, fim) {
  const a = html.indexOf(inicio);
  const b = html.indexOf(fim, a + inicio.length);
  assert.ok(a >= 0 && b > a, 'Função ausente ou alterada: ' + inicio);
  return html.slice(a, b);
}
const codigo = trecho('function diasEntreDatasCivisMandato(', 'function diasDesdeEncaminhamentoMandato(');
const dias = new Function('dataHojeISO', codigo + '\nreturn diasEntreDatasCivisMandato;')(() => '2026-11-07');
const casos = [
  ['2026-11-07', 0], ['2026-10-09', 29], ['2026-10-08', 30],
  ['2026-09-09', 59], ['2026-09-08', 60], ['2026-08-10', 89],
  ['2026-08-09', 90], ['2026-05-12', 179], ['2026-05-11', 180],
  ['2026-02-30', -1], ['', -1], ['2026-11-08', -1]
];
for (const [data, esperado] of casos) assert.equal(dias(data, '2026-11-07'), esperado, data);
const faixa = n => n < 0 ? 'invalido' : n < 30 ? 'recente' : n < 60 ? '30' : n < 90 ? '60' : n < 180 ? '90' : '180';
for (const [data, esperado] of [['2026-10-08','30'],['2026-09-08','60'],['2026-08-09','90'],['2026-05-11','180']]) {
  assert.equal(faixa(dias(data, '2026-11-07')), esperado);
}
assert.match(html, /\[30,60,90,180\]\.includes\(filtroPrazoMandato\)/);
assert.match(html, /filtroPrazoMandato===-1/);
assert.match(html, /function salvarEncaminhamentoPrefeitura\(/);
assert.match(html, /function registrarHistoricoFiscalizacaoMandato\(/);
console.log('OK: 12 casos de datas, 4 limites de faixa e 4 verificações de integração estática.');
