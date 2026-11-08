import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync} from 'node:crypto';
import {criarEmissorAtestados} from './emissor-atestados-privado.mjs';
import {criarRecuperacaoConfirmada} from './recuperacao-confirmada-neon.mjs';
const operadorId='123e4567-e89b-42d3-a456-426614174000';
const {privateKey,publicKey}=generateKeyPairSync('ed25519');
const agora=Date.now();
test('atestado Ed25519 + comprovante: troca chave ativa, bloqueia replay e preserva auditoria (simulado)',async()=>{
 const estado={hashAntigo:Buffer.alloc(32,1),hashAtual:Buffer.alloc(32,1),comprovante:true,nonces:new Set(),auditorias:0};
 const pool={query:async(sql,args)=>{
  assert.match(sql,/aplicar_recuperacao_confirmada/);
  if(!estado.comprovante||estado.nonces.has(args[4]))throw Error('Comprovante consumido');
  estado.comprovante=false;estado.nonces.add(args[4]);
  const anterior=estado.hashAtual;estado.hashAtual=args[3];estado.auditorias++;
  assert.equal(anterior.equals(estado.hashAntigo),true);
  return {rowCount:1,rows:[{revogadas:1,auditorias:1}]};
 }};
 const emissor=criarEmissorAtestados({
  chavePrivadaPem:privateKey.export({format:'pem',type:'pkcs8'}),
  confirmarIdentidadeIndependente:async({evidencia})=>evidencia==='identidade-conferida-teste',
  autorizarOperador:async()=>true,agora:()=>agora
 });
 const recuperar=criarRecuperacaoConfirmada({
  pool,chavePublicaPem:publicKey.export({format:'pem',type:'spki'}),
  operadorPermitido:async({operadorId:id})=>id===operadorId,agora:()=>agora
 });
 const atestado=await emissor({solicitacaoId:'900008',operadorId,acao:'emitir',evidencia:'identidade-conferida-teste'});
 const entrada={solicitacaoId:'900008',operadorId,desafioId:'f'.repeat(32),atestado};
 const resultado=await recuperar(entrada);
 assert.equal(resultado.emitida,true);assert.equal(resultado.revogadas,1);
 assert.equal(estado.hashAtual.equals(estado.hashAntigo),false);
 assert.equal(estado.auditorias,1);
 await assert.rejects(recuperar(entrada),/Comprovante consumido/);
 assert.equal(estado.auditorias,1);
 await assert.rejects(recuperar({...entrada,operadorId:'123e4567-e89b-42d3-a456-426614174001'}),/Operador não autorizado/);
});
