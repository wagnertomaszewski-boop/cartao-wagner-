// Regressão isolada da função real de cálculo de prazos do Painel.
// Executar: node painel/tests/prazos-fiscalizacao-limites.test.cjs
// Não utiliza rede, banco de dados ou informações de cidadãos.
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const inicio = html.indexOf('function diasEntreDatasCivisMandato(');
const fim = html.indexOf('function diasDesdeEncaminhamentoMandato(', inicio);
assert.ok(inicio >= 0 && fim > inicio, 'Função de cálculo não encontrada');
const diasEntre = new Function(html.slice(inicio, fim) + ';return diasEntreDatasCivisMandato;')();
const hoje = '2026-11-09';
const cenarios = [
  ['2026-02-30', -1, 'data impossível'],
  ['2026-11-10', -1, 'data futura'],
  ['2026-11-09', 0, 'hoje'],
  ['2026-10-10', 30, 'limite 30 dias'],
  ['2026-09-10', 60, 'limite 60 dias'],
  ['2026-08-11', 90, 'limite 90 dias'],
  ['2026-05-13', 180, 'limite 180 dias'],
  ['2024-02-29', 984, 'ano bissexto']
];
for (const [data, esperado, descricao] of cenarios) {
  assert.equal(diasEntre(data, hoje), esperado, descricao);
}
console.log('OK: ' + cenarios.length + ' cenários de datas e limites de fiscalização');
