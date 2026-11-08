// node painel/tests/fiscalizacao-ano-bissexto.test.cjs
// Executa a funcao real de calendario do painel; sem rede e sem escrita.
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const inicio=html.indexOf('function diasEntreDatasCivisMandato(');
const fim=html.indexOf('function diasDesdeEncaminhamentoMandato(',inicio);
assert.ok(inicio>=0&&fim>inicio,'Funcao de calendario ausente');
const calcular=new Function('dataHojeISO',html.slice(inicio,fim)+';return diasEntreDatasCivisMandato;')(()=> '2026-11-07');
const casos=[
 ['2024-02-28','2024-03-01',2],
 ['2024-02-29','2024-03-01',1],
 ['2023-02-29','2023-03-01',-1],
 ['2026-10-08','2026-11-07',30],
 ['2026-09-08','2026-11-07',60],
 ['2026-08-09','2026-11-07',90],
 ['2026-05-11','2026-11-07',180],
 ['2026-11-08','2026-11-07',-1]
];
for(const [inicio,hoje,esperado] of casos)
 assert.equal(calcular(inicio,hoje),esperado,`Calendario ${inicio} -> ${hoje}`);
console.log('OK: 8 casos de ano bissexto, datas invalidas e limites 30/60/90/180.');
