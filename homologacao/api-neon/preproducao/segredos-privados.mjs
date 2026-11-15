// Adaptador criptográfico isolado de pré-produção. NÃO conecta nem altera bancos.
// Usar apenas no backend privado, nunca no navegador.
import { createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';

const DOMAIN = Object.freeze({ key: 'mandato:chave:v1:', code: 'mandato:codigo:v1:', phone: 'mandato:telefone:v1:' });

export function verificarSegredoServidor(secret) {
  if (typeof secret !== 'string' || Buffer.byteLength(secret, 'utf8') < 32) throw new Error('Segredo HMAC do servidor ausente ou insuficiente');
  return secret;
}
export function verificadorHmac(tipo, valor, secret) {
  if (!Object.hasOwn(DOMAIN, tipo) || typeof valor !== 'string' || !valor.length) throw new Error('Entrada inválida');
  return createHmac('sha256', verificarSegredoServidor(secret)).update(DOMAIN[tipo]).update(valor, 'utf8').digest();
}
export function conferirVerificador(tipo, valor, esperado, secret) {
  if (!Buffer.isBuffer(esperado) || esperado.length !== 32) return false;
  const atual = verificadorHmac(tipo, valor, secret);
  return timingSafeEqual(atual, esperado);
}
export function criarChave() { return randomBytes(32).toString('base64url'); }
export function criarCodigoTemporario() {
  // Rejeição uniforme não necessária: 2^32 divisível? usa randomInt com eliminação de viés internamente.
  const { randomInt } = cryptoApi;
  return String(randomInt(0, 1000000)).padStart(6, '0');
}
