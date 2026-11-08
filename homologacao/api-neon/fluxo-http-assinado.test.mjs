import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync} from 'node:crypto';
import {criarServidor} from './server.mjs';
import {criarOperacoesChavesPainel} from './operacoes-chaves-painel.mjs';
import {criarGestaoChavesAssinadas} from './gestao-chaves-assinadas.mjs';
import {criarEmissorAtestados} from './emissor-atestados-privado.mjs';
const ADMIN='123e4567-e89b-42d3-a456-426614174000';
const TOKEN='token-administrativo-de-teste-comprido';
const {privateKey,publicKey}=generateKeyPairSync('ed25519');
const agora=1762600000000;
async function iniciar(fn){
 const usos=new Set(),auditoria=[];
 const poolEscrita={query:async(sql,args)=>{
  if(!sql.includes('aplicar_chave_privada'))throw Error('SQL inesperado');
  const nonce=args[4];
  if(usos.has(nonce))throw Error('Atestado já utilizado');
  usos.add(nonce);auditoria.push({acao:args[2],hash:args[3]});
  return {rowCount:1,rows:[{revogadas:args[2]==='revogar'?1:0,auditorias:1}]};
 }};
 const emitirAtestado=criarEmissorAtestados({
  chavePrivadaPem:privateKey.export({type:'pkcs8',format:'pem'}),
  confirmarIdentidadeIndependente:async({evidencia})=>evidencia==='identidade-conferida-teste',
  autorizarOperador:async({operadorId})=>operadorId===ADMIN,agora:()=>agora
 });
 const gestor=criarGestaoChavesAssinadas({
  chavePublicaPem:publicKey.export({type:'spki',format:'pem'}),
  poolEscrita,operadorPermitido:async({operadorId})=>operadorId===ADMIN,agora:()=>agora
 });
 const operacoesChaves=criarOperacoesChavesPainel({
  resolverOperador:async token=>token===TOKEN?ADMIN:null,gestor
 });
 const servidor=criarServidor({verificarAdmin:async token=>token===TOKEN,operacoesChaves,origensPermitidas:['https://wagnertomaszewski-boop.github.io']});
 await new Promise(resolve=>servidor.listen(0,'127.0.0.1',resolve));
 const url='http://127.0.0.1:'+servidor.address().port;
 try{await fn({url,emitirAtestado,auditoria});}
 finally{await new Promise(resolve=>servidor.close(resolve));}
}
async function requisitar(url,acao,atestado,token=TOKEN){
 return fetch(url+'/api/admin/chaves/'+acao,{
  method:'POST',headers:{'Content-Type':'application/json',Origin:'https://wagnertomaszewski-boop.github.io',Authorization:'Bearer '+token},
  body:JSON.stringify({solicitacaoId:'900020',atestado})
 });
}
test('HTTP autenticação simulada + assinatura real: emissão, revogação e replay negado',async()=>{
 await iniciar(async({url,emitirAtestado,auditoria})=>{
  const emitir=await emitirAtestado({solicitacaoId:'900020',operadorId:ADMIN,acao:'emitir',evidencia:'identidade-conferida-teste'});
  const primeira=await requisitar(url,'emitir',emitir);
  assert.equal(primeira.status,200);
  const resposta=await primeira.json();
  assert.equal(resposta.emitida,true);assert.equal(resposta.chave.length,43);
  const repetida=await requisitar(url,'emitir',emitir);
  assert.notEqual(repetida.status,200);
  const revogar=await emitirAtestado({solicitacaoId:'900020',operadorId:ADMIN,acao:'revogar',evidencia:'identidade-conferida-teste'});
  const segunda=await requisitar(url,'revogar',revogar);
  assert.equal(segunda.status,200);assert.equal((await segunda.json()).revogada,true);
  assert.deepEqual(auditoria.map(a=>a.acao),['emitir','revogar']);
  assert.equal(auditoria[0].hash.length,32);assert.equal(auditoria[1].hash,null);
 });
});
test('HTTP bloqueia token inválido e comprovante de ação trocada',async()=>{
 await iniciar(async({url,emitirAtestado,auditoria})=>{
  const emitir=await emitirAtestado({solicitacaoId:'900020',operadorId:ADMIN,acao:'emitir',evidencia:'identidade-conferida-teste'});
  assert.equal((await requisitar(url,'emitir',emitir,'token-invalido-muito-comprido')).status,403);
  assert.notEqual((await requisitar(url,'revogar',emitir)).status,200);
  assert.equal(auditoria.length,0);
 });
});
