import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,sign} from 'node:crypto';
import {criarEmissorExternoPorRecibo} from '../conferente-externo/emitir-atestado-por-recibo.mjs';
import {criarVerificadorContatoIndependente} from '../verificador-contato-independente.mjs';

const conferente=generateKeyPairSync('ed25519');
const verificador=generateKeyPairSync('ed25519');
const estranho=generateKeyPairSync('ed25519');
const agora=Date.parse('2026-11-22T22:00:00.000Z');
const pedidoId='00000000-0000-4000-8000-000000000011';
const operadorId='00000000-0000-4000-8000-000000000012';
const conferenteId='00000000-0000-4000-8000-000000000013';
const verificadorId='00000000-0000-4000-8000-000000000015';
const evidenciaId='00000000-0000-4000-8000-000000000014';
const contexto={pedidoId,solicitacaoId:'123',operadorId,telefoneOriginal:'+555188887777',telefoneNovo:'+5551999988888'};
function emitirRecibo(dados={},chave=verificador.privateKey){
 const rec={
  v:1,finalidade:'posse-independente-whatsapp',
  metodo:'desafio-confirmado-no-destino',
  evidenciaId,verificadorId,...contexto,
  confirmadoEm:new Date(agora-20000).toISOString(),...dados
 };
 const bytes=Buffer.from(JSON.stringify(rec),'utf8');
 return {payload:bytes.toString('base64url'),
  assinatura:sign(null,Buffer.concat([Buffer.from('mandato-posse-contato-v1\0','utf8'),bytes]),chave).toString('base64url')};
}
function emissor(opcoes={}){
 return criarEmissorExternoPorRecibo({
  chavePrivadaConferente:conferente.privateKey,
  chavePublicaVerificador:verificador.publicKey,
  conferenteId,verificadoresPermitidos:[verificadorId],relogio:()=>agora,...opcoes
 });
}
test('fluxo de duas assinaturas independentes: recibo verificado gera comprovante aceito pela API',async()=>{
 const atestado=emissor()({recibo:emitirRecibo(),contexto});
 assert.equal(typeof atestado?.payload,'string');
 assert.equal(typeof atestado?.assinatura,'string');
 assert.equal('chavePrivada' in atestado,false);
 const validar=criarVerificadorContatoIndependente({
  chavePublicaConferente:conferente.publicKey,
  conferentesPermitidos:[conferenteId],
  buscarAtestado:async()=>atestado,relogio:()=>agora
 });
 const resultado=await validar(contexto);
 assert.equal(resultado.validado,true);
 assert.equal(resultado.evidenciaId,evidenciaId);
 assert.equal(resultado.operadorId,operadorId);
 assert.equal(resultado.telefoneOriginal,contexto.telefoneOriginal);
 assert.equal(resultado.telefoneNovo,contexto.telefoneNovo);
});

test('recusa ausência de recibo e assinatura inválida mesmo com declaração administrativa',()=>{
 const assinar=emissor();
 assert.equal(assinar({recibo:null,contexto}),null);
 assert.equal(assinar({recibo:emitirRecibo({},estranho.privateKey),contexto}),null);
 assert.equal(assinar({recibo:{payload:'abc',assinatura:'def'},contexto}),null);
 const original=emitirRecibo();
 const modificado={...original,payload:emitirRecibo({telefoneNovo:'+5551999944444'}).payload};
 assert.equal(assinar({recibo:modificado,contexto}),null);
});

test('recusa dados diferentes do pedido, conferência, verificador, finalidade ou aparelho',()=>{
 const assinar=emissor();
 const alteracoes=[
  {pedidoId:'00000000-0000-4000-8000-000000000022'},
  {solicitacaoId:'124'},
  {operadorId:'00000000-0000-4000-8000-000000000020'},
  {telefoneOriginal:'+555188887770'},
  {telefoneNovo:'+5551999944444'},
  {verificadorId:'00000000-0000-4000-8000-000000000099'},
  {verificadorId:conferenteId},
  {verificadorId:operadorId},
  {metodo:'checkbox'},
  {finalidade:'outra-finalidade'},
  {v:2},
  {acessoManual:true}
 ];
 for(const mudanca of alteracoes)
  assert.equal(assinar({recibo:emitirRecibo(mudanca),contexto}),null,JSON.stringify(mudanca));
});

test('recusa recibo expirado, futuro, data malformada e identidade do operador coincidente com conferente',()=>{
 const assinar=emissor();
 for(const delta of [-300001,1]){
  const comprovante=emitirRecibo({confirmadoEm:new Date(agora+delta).toISOString()});
  assert.equal(assinar({recibo:comprovante,contexto}),null);
 }
 assert.equal(assinar({recibo:emitirRecibo({confirmadoEm:'2026-11-22'}),contexto}),null);
 const c={...contexto,operadorId:conferenteId};
 assert.equal(assinar({recibo:emitirRecibo({operadorId:conferenteId}),contexto:c}),null);
});

test('separa as chaves e recusa configuração sem segundo verificador confiável',()=>{
 assert.throws(()=>emissor({chavePublicaVerificador:conferente.publicKey}),/funções distintas/);
 assert.throws(()=>emissor({verificadoresPermitidos:[conferenteId]}),/identidades independentes/i);
 assert.throws(()=>emissor({verificadoresPermitidos:[]}),/identidades independentes/i);
 assert.throws(()=>emissor({validadeMaximaMs:3600000}),/Validade/);
 const assinar=emissor();
 assert.equal(assinar({recibo:emitirRecibo(),contexto:{...contexto,telefoneNovo:'invalido'}}),null);
});
