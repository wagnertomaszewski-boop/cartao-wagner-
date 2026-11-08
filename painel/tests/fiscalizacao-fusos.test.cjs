// node painel/tests/fiscalizacao-fusos.test.cjs
// Verifica calculo de dias civis em fusos diferentes, sem rede ou dados reais.
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const inicio = html.indexOf('function diasEntreDatasCivisMandato(');
const fim = html.indexOf('function diasDesdeEncaminhamentoMandato(', inicio);
assert.ok(inicio >= 0 && fim > inicio, 'Funcao de dias civis nao encontrada');
const fonte = html.slice(inicio, fim);
const casos = [
  ['2026-10-09','2026-11-07',29], ['2026-10-08','2026-11-07',30],
  ['2026-09-09','2026-11-07',59], ['2026-09-08','2026-11-07',60],
  ['2026-08-10','2026-11-07',89], ['2026-08-09','2026-11-07',90],
  ['2026-05-12','2026-11-07',179], ['2026-05-11','2026-11-07',180],
  ['2024-02-28','2024-03-01',2], ['2024-02-29','2024-03-01',1],
  ['2023-02-29','2023-03-01',-1], ['2026-11-08','2026-11-07',-1]
];
const codigo = fonte + '\nconst casos=' + JSON.stringify(casos) + ';for(const [a,b,esperado] of casos){const obtido=diasEntreDatasCivisMandato(a,b);if(obtido!==esperado)throw Error(a+" -> "+b+": "+obtido+" != "+esperado)};console.log(casos.length);';
for (const tz of ['UTC','America/Sao_Paulo','Pacific/Auckland']) {
  const saida = execFileSync(process.execPath, ['-e', codigo], {encoding:'utf8',env:{...process.env,TZ:tz}}).trim();
  assert.equal(saida,String(casos.length),'Fuso '+tz);
}
console.log('OK: 12 casos em 3 fusos (36 verificacoes), usando funcao real do painel.');
