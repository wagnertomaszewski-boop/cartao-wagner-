import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,sign} from 'node:crypto';
import {criarVerificadorContatoIndependente} from '../verificador-contato-independente.mjs';

const {publicKey,privateKey}=generateKeyPairSync('ed25519');
const instante=Date.parse('2026-11-22T19:10:00.000Z');
const pedidoId='00000000-0000-4000-8000-000000000011';
const operadorId='00000000-0000-4000-8000-000000000012';
const conferenteId='00000000-0000-4000-8000-000000000013';
const evidenciaId='00000000-0000-4000-8000-000000000014';
const contexto={pedidoId,solicitacaoId:'123',operadorId,
 telefoneOriginal:'+555188887777',telefoneNovo:'+5551999988888'};
const dadosValidos=()=>({v:1,finalidade:'regularizacao-whatsapp-legado',
 metodo:'desafio-independente-de-posse',evidenciaId,conferenteId,...contexto,
 verificadoEm:new Date(instante-30000).toISOString()});
function assinar(dados){
 const bytes=Buffer.from(JSON.stringify(dados),'utf8');
 return {payload:bytes.toString('base64url'),assinatura:sign(null,bytes,privateKey).toString('base64url')};
}
function criarFonte(comprovante,opts={}){
 return criarVerificadorContatoIndependente({
  chavePublicaConferente:publicKey,conferentesPermitidos:[conferenteId],
  buscarAtestado:async()=>comprovante,relogio:()=>instante,...opts
 });
}

test('aceita somente prova assinada por conferente externo e vinculada ao contexto',async()=>{
 const validar=criarFonte(assinar(dadosValidos()));
 const resultado=await validar(contexto);
 assert.equal(resultado.validado,true);
 assert.equal(resultado.evidenciaId,evidenciaId);
 assert.equal(resultado.telefoneOriginal,contexto.telefoneOriginal);
 assert.equal(resultado.telefoneNovo,contexto.telefoneNovo);
 assert.equal(resultado.pedidoId,pedidoId);
 assert.equal(resultado.operadorId,operadorId);
 assert.equal(resultado.solicitacaoId,'123');
 assert.equal(Object.isFrozen(resultado),true);
});

test('recusa ausência de prova, assinatura adulterada, chave incorreta ou fonte indisponível',async()=>{
 assert.equal(await criarFonte(null)(contexto),null);
 const original=assinar(dadosValidos());
 const adulterado={...original,payload:assinar({...dadosValidos(),telefoneNovo:'+5551999911111'}).payload};
 assert.equal(await criarFonte(adulterado)(contexto),null);
 const outraChave=generateKeyPairSync('ed25519').publicKey;
 assert.equal(await criarFonte(original,{chavePublicaConferente:outraChave})(contexto),null);
 assert.equal(await criarFonte(original,{buscarAtestado:async()=>{throw Error('fonte sem acesso');}})(contexto),null);
 assert.equal(await criarFonte({...original,assinatura:'abc'})(contexto),null);
});

test('recusa atestado válido destinado a outra solicitação, pedido, operador, conferente ou número',async()=>{
 const alteracoes=[
  {pedidoId:'00000000-0000-4000-8000-000000000021'},
  {solicitacaoId:'124'},
  {operadorId:'00000000-0000-4000-8000-000000000022'},
  {telefoneOriginal:'+555188887770'},
  {telefoneNovo:'+5551999988887'},
  {conferenteId:'00000000-0000-4000-8000-000000000023'},
  {conferenteId:operadorId},
  {metodo:'checkbox-no-navegador'},
  {finalidade:'gestao-chave-privada'},
  {v:2}
 ];
 for(const alteracao of alteracoes)
  assert.equal(await criarFonte(assinar({...dadosValidos(),...alteracao}))(contexto),null,JSON.stringify(alteracao));
 assert.equal(await criarFonte(assinar({...dadosValidos(),autorizado:true}))(contexto),null);
 assert.equal(await criarFonte(assinar({...dadosValidos(),verificadoEm:'2026-11-22'}))(contexto),null);
});

test('recusa provas expiradas, futuras e conferentes não autorizados; aceita prazo limite',async()=>{
 const dentro={...dadosValidos(),verificadoEm:new Date(instante-300000).toISOString()};
 assert.equal((await criarFonte(assinar(dentro))(contexto)).validado,true);
 for(const intervalo of [-300001,1]){
  const d={...dadosValidos(),verificadoEm:new Date(instante+intervalo).toISOString()};
  assert.equal(await criarFonte(assinar(d))(contexto),null);
 }
 assert.equal(await criarFonte(assinar(dadosValidos()),{conferentesPermitidos:['00000000-0000-4000-8000-000000000099']})(contexto),null);
});

test('nenhum contexto inválido nem configuração sem fonte externa inicia uma regularização',async()=>{
 const valido=criarFonte(assinar(dadosValidos()));
 for(const dados of [{...contexto,pedidoId:'invalido'},
  {...contexto,telefoneNovo:'+555188887777'},
  {...contexto,operadorId:'anônimo'}, {...contexto,solicitacaoId:'-1'}]){
  // O telefone histórico pode ter dez dígitos; proíbe destino móvel incompleto.
  if(dados.telefoneNovo===contexto.telefoneOriginal)continue;
  assert.equal(await valido(dados),null);
 }
 assert.throws(()=>criarVerificadorContatoIndependente({chavePublicaConferente:publicKey,
  conferentesPermitidos:[conferenteId]}),/Fonte privada/);
 assert.throws(()=>criarFonte(assinar(dadosValidos()),{validadeMaximaMs:3600000}),/Prazo/);
});
