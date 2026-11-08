import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,randomBytes,sign} from 'node:crypto';
import {criarGestaoChavesAssinadas} from './gestao-chaves-assinadas.mjs';
const ADMIN='123e4567-e89b-42d3-a456-426614174000';
const OUTRO='123e4567-e89b-42d3-a456-426614174001';
const {privateKey,publicKey}=generateKeyPairSync('ed25519');
const agora=1762600000000;
function atestado(acao='emitir',operadorId=ADMIN){
 const payload=Buffer.from(JSON.stringify({v:1,finalidade:'gestao-chave-privada',solicitacaoId:'900020',operadorId,acao,emitidoEm:agora-1000,expiraEm:agora+60000,nonce:randomBytes(16).toString('hex')}));
 return payload.toString('base64url')+'.'+sign(null,payload,privateKey).toString('base64url');
}
test('emite e revoga com atestados vinculados ao operador e auditoria atômica',async()=>{
 const chamadas=[];
 const poolEscrita={query:async(sql,args)=>{assert.match(sql,/aplicar_chave_privada/);chamadas.push(args);return {rowCount:1,rows:[{revogadas:0,auditorias:1}]};}};
 const gestao=criarGestaoChavesAssinadas({chavePublicaPem:publicKey.export({type:'spki',format:'pem'}),poolEscrita,operadorPermitido:async({operadorId})=>operadorId===ADMIN,agora:()=>agora});
 const emitida=await gestao.emitir({solicitacaoId:'900020',operadorId:ADMIN,atestado:atestado('emitir')});
 assert.equal(emitida.emitida,true);assert.equal(emitida.chave.length,43);
 assert.equal(chamadas[0][2],'emitir');assert.equal(chamadas[0][3].length,32);
 assert.deepEqual(await gestao.revogar({solicitacaoId:'900020',operadorId:ADMIN,atestado:atestado('revogar')}),{revogada:true});
 assert.equal(chamadas[1][2],'revogar');assert.equal(chamadas[1][3],null);
});
test('bloqueia atestado de outro operador sem escrita',async()=>{
 let consultas=0;
 const gestao=criarGestaoChavesAssinadas({chavePublicaPem:publicKey.export({type:'spki',format:'pem'}),poolEscrita:{query:async()=>{consultas++;return {rowCount:1,rows:[{auditorias:1}]};}},operadorPermitido:async()=>true,agora:()=>agora});
 await assert.rejects(gestao.emitir({solicitacaoId:'900020',operadorId:ADMIN,atestado:atestado('emitir',OUTRO)}),/não pertence ao operador/);
 assert.equal(consultas,0);
});
test('bloqueia ação não assinada e operador não autorizado',async()=>{
 let consultas=0;
 const gestao=criarGestaoChavesAssinadas({chavePublicaPem:publicKey.export({type:'spki',format:'pem'}),poolEscrita:{query:async()=>{consultas++;}},operadorPermitido:async({operadorId})=>operadorId===ADMIN,agora:()=>agora});
 await assert.rejects(gestao.revogar({solicitacaoId:'900020',operadorId:ADMIN,atestado:atestado('emitir')}),/Identidade não confirmada/);
 await assert.rejects(gestao.emitir({solicitacaoId:'900020',operadorId:OUTRO,atestado:atestado('emitir',OUTRO)}),/Operador não autorizado/);
 assert.equal(consultas,0);
});
