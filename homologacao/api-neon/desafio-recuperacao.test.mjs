import {test} from 'node:test';
import assert from 'node:assert/strict';
import {criarDesafiosRecuperacao} from './desafio-recuperacao.mjs';

const segredo='segredo-ficticio-de-homologacao-com-mais-de-32-bytes';
test('não aceita segredo fraco',()=>{
 assert.throws(()=>criarDesafiosRecuperacao({segredo:'fraco'}));
});
test('código correto é válido uma única vez',()=>{
 const d=criarDesafiosRecuperacao({segredo,gerarCodigo:()=> '123456'});
 assert.equal(d.emitir('pedido-a'),'123456');
 assert.equal(d.confirmar('pedido-a','123456'),true);
 assert.equal(d.confirmar('pedido-a','123456'),false);
});
test('código expira sem confirmação',()=>{
 let tempo=1000;
 const d=criarDesafiosRecuperacao({segredo,agora:()=>tempo,validadeMs:1000,gerarCodigo:()=> '123456'});
 d.emitir('pedido-a');tempo=2000;
 assert.equal(d.confirmar('pedido-a','123456'),false);
});
test('limite de tentativas invalida desafio',()=>{
 const d=criarDesafiosRecuperacao({segredo,maxTentativas:2,gerarCodigo:()=> '123456'});
 d.emitir('pedido-a');
 assert.equal(d.confirmar('pedido-a','000000'),false);
 assert.equal(d.confirmar('pedido-a','000000'),false);
 assert.equal(d.confirmar('pedido-a','123456'),false);
});
test('código não funciona para outro pedido',()=>{
 const d=criarDesafiosRecuperacao({segredo,gerarCodigo:()=> '123456'});
 d.emitir('pedido-a');
 assert.equal(d.confirmar('pedido-b','123456'),false);
 assert.equal(d.confirmar('pedido-a','123456'),true);
});
test('reemitir substitui desafio anterior',()=>{
 let codigo='123456';
 const d=criarDesafiosRecuperacao({segredo,gerarCodigo:()=>codigo});
 d.emitir('pedido-a');codigo='654321';d.emitir('pedido-a');
 assert.equal(d.confirmar('pedido-a','123456'),false);
 assert.equal(d.confirmar('pedido-a','654321'),true);
});
test('invalidação explícita impede uso',()=>{
 const d=criarDesafiosRecuperacao({segredo,gerarCodigo:()=> '123456'});
 d.emitir('pedido-a');d.invalidar('pedido-a');
 assert.equal(d.confirmar('pedido-a','123456'),false);
});
