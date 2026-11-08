import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,randomBytes,sign} from 'node:crypto';
import {criarVerificadorAtestadoIdentidade} from './verificar-atestado-identidade.mjs';
const {privateKey,publicKey}=generateKeyPairSync('ed25519');
const agora=1762600000000;
const usados=new Set();
const consumirNonce=async({nonce})=>{if(usados.has(nonce))return false;usados.add(nonce);return true;};
const verificar=criarVerificadorAtestadoIdentidade({chavePublicaPem:publicKey.export({type:'spki',format:'pem'}),consumirNonce,agora:()=>agora});
function emitir(mudancas={}){
 const dados={v:1,finalidade:'gestao-chave-privada',solicitacaoId:'900020',acao:'emitir',emitidoEm:agora-1000,expiraEm:agora+60000,nonce:randomBytes(16).toString('hex'),...mudancas};
 const bytes=Buffer.from(JSON.stringify(dados));
 return bytes.toString('base64url')+'.'+sign(null,bytes,privateKey).toString('base64url');
}
test('aceita atestado assinado e rejeita reutilização',async()=>{
 const atestado=emitir();
 const args={solicitacaoId:'900020',atestado,contexto:{acao:'emitir'}};
 assert.equal(await verificar(args),true);
 assert.equal(await verificar(args),false);
});
test('nega atestado para solicitação ou ação diferente',async()=>{
 assert.equal(await verificar({solicitacaoId:'900021',atestado:emitir(),contexto:{acao:'emitir'}}),false);
 assert.equal(await verificar({solicitacaoId:'900020',atestado:emitir(),contexto:{acao:'revogar'}}),false);
});
test('nega expirado, validade excessiva e assinatura adulterada',async()=>{
 for(const alteracao of [{expiraEm:agora},{expiraEm:agora+600000},{emitidoEm:agora+1000}]){
  assert.equal(await verificar({solicitacaoId:'900020',atestado:emitir(alteracao),contexto:{acao:'emitir'}}),false);
 }
 const atestado=emitir();
 const [payload,assinatura]=atestado.split('.');
 const bytes=Buffer.from(payload,'base64url');
 const objeto=JSON.parse(bytes.toString());
 objeto.solicitacaoId='900021';
 const adulterado=Buffer.from(JSON.stringify(objeto)).toString('base64url')+'.'+assinatura;
 assert.equal(await verificar({solicitacaoId:'900021',atestado:adulterado,contexto:{acao:'emitir'}}),false);
});
test('não inicia sem persistência de nonce',()=>{
 assert.throws(()=>criarVerificadorAtestadoIdentidade({chavePublicaPem:publicKey.export({type:'spki',format:'pem'})}),/nonce obrigatório/);
});
