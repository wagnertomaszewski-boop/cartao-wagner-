// Regressão de viradas de mês/ano e limites de fiscalização.
// node painel/tests/prazos-fiscalizacao-viradas.test.cjs
// Sem rede, credenciais, banco ou dados pessoais.
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const inicio = html.indexOf('function diasEntreDatasCivisMandato(');
const fim = html.indexOf('function diasDesdeEncaminhamentoMandato(', inicio);
assert.ok(inicio >= 0 && fim > inicio, 'Função de cálculo não encontrada');
const calcular = new Function(html.slice(inicio, fim) + ';return diasEntreDatasCivisMandato;')();
const cenarios = [
  ['2026-10-31', '2026-11-01', 1, 'virada de mês'],
  ['2026-12-31', '2027-01-01', 1, 'virada de ano'],
  ['2024-02-28', '2024-03-01', 2, 'fevereiro bissexto'],
  ['2025-02-29', '2025-03-01', -1, 'data inexistente'],
  ['2026-11-10', '2026-11-09', -1, 'encaminhamento futuro'],
  ['2026-11-09', '2026-11-09', 0, 'mesmo dia'],
  ['2026-10-10', '2026-11-09', 30, '30 dias'],
  ['2026-09-10', '2026-11-09', 60, '60 dias'],
  ['2026-08-11', '2026-11-09', 90, '90 dias'],
  ['2026-05-13', '2026-11-09', 180, '180 dias']
];
for (const [inicio, hoje, esperado, descricao] of cenarios) {
  assert.equal(calcular(inicio, hoje), esperado, descricao);
}
console.log('OK: ' + cenarios.length + ' cenários de viradas e limites de fiscalização');
