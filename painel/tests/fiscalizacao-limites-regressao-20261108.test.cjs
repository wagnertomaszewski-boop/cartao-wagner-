'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const start = html.indexOf('function diasEntreDatasCivisMandato(');
const end = html.indexOf('function diasDesdeEncaminhamentoMandato(', start);
assert.ok(start >= 0 && end > start, 'Função de cálculo de prazo não encontrada');
const diasEntre = new Function('dataHojeISO', html.slice(start, end) + '\nreturn diasEntreDatasCivisMandato;')(() => '2026-11-08');
const hoje = '2026-11-08';
const casos = [
  ['2026-10-10', 29], ['2026-10-09', 30],
  ['2026-09-10', 59], ['2026-09-09', 60],
  ['2026-08-11', 89], ['2026-08-10', 90],
  ['2026-05-13', 179], ['2026-05-12', 180],
  ['2026-02-30', -1], ['2026-11-09', -1]
];
for (const [data, esperado] of casos) {
  assert.equal(diasEntre(data, hoje), esperado, 'Data: ' + data);
}
const faixa = dias => dias < 0 ? null : dias >= 180 ? 180 : dias >= 90 ? 90 : dias >= 60 ? 60 : dias >= 30 ? 30 : 0;
for (const [data, esperado] of casos.slice(0, 8)) {
  assert.equal(faixa(diasEntre(data, hoje)), faixa(esperado), 'Faixa: ' + data);
}
console.log('OK: 10 datas e 8 classificações de prazo.');
