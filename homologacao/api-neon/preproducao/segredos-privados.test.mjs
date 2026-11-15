import test from 'node:test';
import assert from 'node:assert/strict';
import { criarChave, criarCodigoTemporario, verificadorHmac, conferirVerificador, verificarSegredoServidor } from './segredos-privados.mjs';
const secret = 'segredo-sintetico-somente-teste-mais-de-32-caracteres';
test('chaves aleatórias independentes e tamanho adequado', () => {
  const a = criarChave(), b = criarChave();
  assert.notEqual(a,b);
  assert.equal(Buffer.from(a,'base64url').length,32);
});
test('código temporário tem seis dígitos', () => {
  for(let i=0;i<100;i++) assert.match(criarCodigoTemporario(), /^[0-9]{6}$/);
});
test('verificador é específico por finalidade e compara sem revelar segredo', () => {
  const a=verificadorHmac('key','valor-teste',secret);
  assert.equal(a.length,32);
  assert.ok(conferirVerificador('key','valor-teste',a,secret));
  assert.equal(conferirVerificador('code','valor-teste',a,secret),false);
  assert.equal(conferirVerificador('key','outro',a,secret),false);
  assert.equal(conferirVerificador('key','valor-teste',Buffer.alloc(2),secret),false);
});
test('rejeita segredo insuficiente e tipo desconhecido', () => {
  assert.throws(()=>verificarSegredoServidor('curto'));
  assert.throws(()=>verificadorHmac('invalido','abc',secret));
});
