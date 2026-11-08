// Primitivas para futura emissão de chaves, ainda NÃO ligadas a rotas de produção.
// O servidor deve verificar identidade e autorização ANTES de emitir ou girar chave.
import {randomBytes,createHash,timingSafeEqual} from 'node:crypto';

const PADRAO=/^[A-Za-z0-9_-]{43}$/;
export function emitirChavePrivada() {
 const bytes=randomBytes(32);
 return Object.freeze({
  chave:bytes.toString('base64url'),
  hash:Buffer.from(createHash('sha256').update(bytes).digest())
 });
}
export function hashChavePrivada(chave) {
 if(typeof chave!=='string'||!PADRAO.test(chave)) return null;
 const bytes=Buffer.from(chave,'base64url');
 if(bytes.length!==32||bytes.toString('base64url')!==chave)return null;
 return createHash('sha256').update(bytes).digest();
}
export function compararChavePrivada(chave,hashArmazenado) {
 const calculado=hashChavePrivada(chave);
 if(!calculado||!Buffer.isBuffer(hashArmazenado)||hashArmazenado.length!==32)return false;
 return timingSafeEqual(calculado,hashArmazenado);
}
