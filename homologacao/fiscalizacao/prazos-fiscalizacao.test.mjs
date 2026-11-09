import test from 'node:test';
import assert from 'node:assert/strict';
import { diasDesdeEncaminhamento, faixaAlerta } from './prazos-fiscalizacao.mjs';

test('limites exatos de alerta e ausencia antes de 30 dias', () => {
  for (const [dias, esperado] of [[0,null],[29,null],[30,30],[59,30],[60,60],[89,60],[90,90],[179,90],[180,180],[365,180]]) {
    assert.equal(faixaAlerta(dias), esperado);
  }
});
test('concluidas nao geram alerta', () => assert.equal(faixaAlerta(200,true),null));
test('virada de mes e ano bissexto em UTC', () => {
  assert.equal(diasDesdeEncaminhamento('2024-02-28','2024-03-01'),2);
  assert.equal(diasDesdeEncaminhamento('2025-12-31','2026-01-30'),30);
});
test('datas impossiveis, formatos incorretos e futuras sao rejeitados', () => {
  for (const [inicio,hoje] of [['2026-02-30','2026-03-01'],['2026-1-01','2026-02-01'],['2026-11-09','2026-11-08'],['2026-01-01','2026-02-30']]) {
    assert.throws(() => diasDesdeEncaminhamento(inicio,hoje), RangeError);
  }
});
test('entradas de dias invalidas sao rejeitadas', () => {
  for (const dias of [-1,1.5,NaN,Infinity]) assert.throws(() => faixaAlerta(dias),RangeError);
});
