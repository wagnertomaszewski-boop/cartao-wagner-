import test from 'node:test';
import assert from 'node:assert/strict';
import { validarEncaminhamento, confirmarLeituraEncaminhamento } from './validacao-encaminhamento.mjs';
const hoje = '2026-11-08';
test('aceita protocolo e data oficial e preserva exatamente os campos', () => {
  const entrada = { data: '2026-02-28', protocolo: 'OF-123/2026' };
  assert.deepEqual(validarEncaminhamento(entrada, hoje), entrada);
});
test('rejeita protocolo vazio, excessivo, HTML e caracteres de controle', () => {
  for (const protocolo of ['', ' ', 'A'.repeat(81), '<script>', 'OF\n1', ' OF-1', 'OF-1 ']) {
    assert.throws(() => validarEncaminhamento({ data: hoje, protocolo }, hoje), TypeError);
  }
});
test('rejeita datas invalidas e futuras sem usar relogio local', () => {
  for (const data of ['2026-02-30', '2025-02-29', '2026-11-09', '08/11/2026', '2026-00-01']) {
    assert.throws(() => validarEncaminhamento({ data, protocolo: 'OF-1' }, hoje), RangeError);
  }
  assert.equal(validarEncaminhamento({ data: '2024-02-29', protocolo: 'OF-1' }, hoje).data, '2024-02-29');
});
test('leitura independente confirma apenas correspondencia exata', () => {
  const enviado = validarEncaminhamento({ data: '2026-11-07', protocolo: 'OF-123' }, hoje);
  assert.equal(confirmarLeituraEncaminhamento(enviado, { ...enviado }), true);
  for (const lido of [null, {}, { ...enviado, data: hoje }, { ...enviado, protocolo: 'OF-124' }]) {
    assert.throws(() => confirmarLeituraEncaminhamento(enviado, lido), /nao confirmada/);
  }
});
