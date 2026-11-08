import {test} from 'node:test';
import assert from 'node:assert/strict';
import {emitirChavePrivada,hashChavePrivada,compararChavePrivada} from './chaves-privadas.mjs';

test('emite chave aleatória de 256 bits e armazena somente hash de 32 bytes',()=>{
 const a=emitirChavePrivada(),b=emitirChavePrivada();
 assert.match(a.chave,/^[A-Za-z0-9_-]{43}$/);
 assert.notEqual(a.chave,b.chave);
 assert.equal(a.hash.length,32);
 assert.ok(Buffer.isBuffer(a.hash));
 assert.notEqual(a.hash.toString('hex'),Buffer.from(a.chave).toString('hex'));
 assert.deepEqual(hashChavePrivada(a.chave),a.hash);
 assert.equal(compararChavePrivada(a.chave,a.hash),true);
 assert.equal(compararChavePrivada(b.chave,a.hash),false);
});
test('nega chave vazia, curta, adulterada e codificação não canônica',()=>{
 const a=emitirChavePrivada();
 for(const invalida of [null,undefined,42,'','curta',a.chave+'=',a.chave+'!',a.chave.slice(1),a.chave+'a'])
  assert.equal(compararChavePrivada(invalida,a.hash),false);
 assert.equal(compararChavePrivada(a.chave,Buffer.alloc(31)),false);
 assert.equal(compararChavePrivada(a.chave,a.hash.toString('hex')),false);
});
test('hash nunca equivale ao segredo de acompanhamento',()=>{
 const {chave,hash}=emitirChavePrivada();
 assert.equal(hashChavePrivada(hash.toString('base64url'))?.equals(hash),false);
 assert.equal(compararChavePrivada(hash.toString('base64url'),hash),false);
 assert.equal(compararChavePrivada(chave,hash),true);
});
