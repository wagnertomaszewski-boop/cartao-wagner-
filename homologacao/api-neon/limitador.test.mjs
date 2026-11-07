import {test} from 'node:test';
import assert from 'node:assert/strict';
import {criarLimitador} from './limitador.mjs';
test('bloqueia excesso de tentativas e libera após janela',()=>{
 let agora=100;
 const l=criarLimitador({maximo:2,janelaMs:1000,relogio:()=>agora});
 assert.equal(l.verificar('cliente-a'),true);
 assert.equal(l.verificar('cliente-a'),true);
 assert.equal(l.verificar('cliente-a'),false);
 assert.equal(l.verificar('cliente-b'),true);
 agora=1100;
 assert.equal(l.verificar('cliente-a'),true);
});
test('rejeita chaves inválidas e configuração inválida',()=>{
 const l=criarLimitador();
 assert.equal(l.verificar(''),false);
 assert.equal(l.verificar('x'.repeat(201)),false);
 assert.throws(()=>criarLimitador({maximo:0}));
});

test('limite de memória falha fechado e permite nova chave após expiração',()=>{
 let agora=0;
 const l=criarLimitador({maxChaves:1,maximo:2,janelaMs:100,relogio:()=>agora});
 assert.equal(l.verificar('a'),true);
 assert.equal(l.verificar('b'),false);
 agora=100;
 assert.equal(l.verificar('b'),true);
});

test('chave existente expirada é renovada quando a memória está cheia',()=>{
 let agora=0;
 const l=criarLimitador({maxChaves:1,maximo:1,janelaMs:100,relogio:()=>agora});
 assert.equal(l.verificar('a'),true);
 assert.equal(l.verificar('a'),false);
 agora=100;
 assert.equal(l.verificar('a'),true);
 assert.equal(l.verificar('a'),false);
});
