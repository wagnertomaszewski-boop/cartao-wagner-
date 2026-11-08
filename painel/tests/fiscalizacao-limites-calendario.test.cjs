// node painel/tests/fiscalizacao-limites-calendario.test.cjs
// Teste somente de leitura do codigo local: sem rede, banco ou dados pessoais.
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const start = html.indexOf('function diasEntreDatasCivisMandato(');
const end = html.indexOf('function diasDesdeEncaminhamentoMandato(', start);
assert.ok(start >= 0 && end > start, 'Funcao de calculo nao localizada; revisar teste apos refatoracao');
const source = html.slice(start, end);
const dias = new Function('dataHojeISO', source + '\nreturn diasEntreDatasCivisMandato;')(() => '2026-11-07');
const hoje = '2026-11-07';
const casos = [
  ['2026-11-07', 0], ['2026-11-06', 1],
  ['2026-10-09', 29], ['2026-10-08', 30], ['2026-10-07', 31],
  ['2026-09-09', 59], ['2026-09-08', 60], ['2026-09-07', 61],
  ['2026-08-10', 89], ['2026-08-09', 90], ['2026-08-08', 91],
  ['2026-05-12', 179], ['2026-05-11', 180], ['2026-05-10', 181],
  ['2026-11-08', -1], ['2026-02-30', -1], ['2026-13-01', -1], ['', -1]
];
for (const [data, esperado] of casos) assert.equal(dias(data, hoje), esperado, `Data ${data}`);
const faixa = n => n < 0 ? 'invalido' : n < 30 ? 'recente' : n < 60 ? '30' : n < 90 ? '60' : n < 180 ? '90' : '180';
for (const [data, esperado] of [
  ['2026-10-09','recente'], ['2026-10-08','30'],
  ['2026-09-09','30'], ['2026-09-08','60'],
  ['2026-08-10','60'], ['2026-08-09','90'],
  ['2026-05-12','90'], ['2026-05-11','180']
]) assert.equal(faixa(dias(data, hoje)), esperado, `Faixa ${data}`);
console.log(`OK: ${casos.length} casos de datas e 8 limites de faixa`);
