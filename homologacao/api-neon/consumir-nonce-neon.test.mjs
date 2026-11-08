import test from 'node:test';
import assert from 'node:assert/strict';
import {criarConsumidorNonceNeon} from './consumir-nonce-neon.mjs';
const nonce='a'.repeat(32);
test('registra nonce por INSERT atômico e retorna true uma vez',async()=>{
 let chamadas=0;
 const consumir=criarConsumidorNonceNeon({pool:{query:async(sql,params)=>{
  chamadas++;
  assert.match(sql,/ON CONFLICT \(nonce\) DO NOTHING/);
  assert.deepEqual(params,[nonce,'900020',1762600060000]);
  return {rowCount:chamadas===1?1:0};
 }}});
 assert.equal(await consumir({nonce,solicitacaoId:'900020',expiraEm:1762600060000}),true);
 assert.equal(await consumir({nonce,solicitacaoId:'900020',expiraEm:1762600060000}),false);
});
test('nega dados inválidos antes de acessar banco',async()=>{
 let chamadas=0;
 const consumir=criarConsumidorNonceNeon({pool:{query:async()=>{chamadas++;return {rowCount:1};}}});
 assert.equal(await consumir({nonce:'invalido',solicitacaoId:'900020',expiraEm:1762600060000}),false);
 assert.equal(await consumir({nonce,solicitacaoId:'0',expiraEm:1762600060000}),false);
 assert.equal(chamadas,0);
});
test('exige conexão privada de escrita',()=>{
 assert.throws(()=>criarConsumidorNonceNeon({}),/escrita obrigatória/);
});
