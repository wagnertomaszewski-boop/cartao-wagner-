// PROTÓTIPO ISOLADO DO CONFERENTE. NÃO IMPORTAR NA API OU NO NAVEGADOR.
// O atestado só pode ser emitido após a verificação de um recibo Ed25519
// de um SEGUNDO verificador independente, obtido fora do sistema de atendimento.
// O código NÃO envia WhatsApp e NÃO obtém prova de posse por conta própria.
import {createPrivateKey,createPublicKey,sign,verify} from 'node:crypto';

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const E164LEGADO=/^\+55[1-9]\d{9,10}$/;
const E164NOVO=/^\+55[1-9]\d{10}$/;
const B64=/^[A-Za-z0-9_-]+$/;
const PREFIXO=Buffer.from('mandato-posse-contato-v1\0','utf8');
const CAMPOS_RECIBO=['confirmadoEm','evidenciaId','finalidade','metodo','operadorId','pedidoId','solicitacaoId','telefoneNovo','telefoneOriginal','v','verificadorId'];

function chavePublica(valor){
 return valor?.type==='public'?valor:createPublicKey(valor);
}
function chavePrivada(valor){
 return valor?.type==='private'?valor:createPrivateKey(valor);
}
function isoValido(s){
 if(typeof s!=='string'||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(s))return false;
 const n=Date.parse(s);
 return Number.isFinite(n)&&new Date(n).toISOString()===s;
}
function contextoValido(c){
 return c&&typeof c==='object'&&!Array.isArray(c)&&
 UUID.test(c.pedidoId||'')&&UUID.test(c.operadorId||'')&&
 /^[1-9]\d{0,15}$/.test(String(c.solicitacaoId))&&
 E164LEGADO.test(c.telefoneOriginal||'')&&E164NOVO.test(c.telefoneNovo||'');
}
function objetoAssinado(c){
 if(!c||typeof c!=='object'||Array.isArray(c)||
 typeof c.payload!=='string'||typeof c.assinatura!=='string'||
 c.payload.length>2048||c.assinatura.length>128||
 !B64.test(c.payload)||!B64.test(c.assinatura))return null;
 const bytes=Buffer.from(c.payload,'base64url'),assinatura=Buffer.from(c.assinatura,'base64url');
 if(bytes.length>1400||assinatura.length!==64)return null;
 try{
  const dados=JSON.parse(bytes.toString('utf8'));
  if(!dados||typeof dados!=='object'||Array.isArray(dados)||
    JSON.stringify(dados)!==bytes.toString('utf8'))return null;
  return {bytes,assinatura,dados};
 }catch{return null;}
}

/**
 * @param {{chavePrivadaConferente:any,chavePublicaVerificador:any,
 * conferenteId:string,verificadoresPermitidos:string[],
 * relogio?:()=>number,validadeMaximaMs?:number}} config
 */
export function criarEmissorExternoPorRecibo({
 chavePrivadaConferente,chavePublicaVerificador,conferenteId,
 verificadoresPermitidos,relogio=()=>Date.now(),validadeMaximaMs=300000
}={}){
 if(!UUID.test(conferenteId||'')||!Array.isArray(verificadoresPermitidos)||
  verificadoresPermitidos.length===0||
  !verificadoresPermitidos.every(x=>UUID.test(x)&&x!==conferenteId))
  throw Error('Identidades independentes inválidas');
 if(typeof relogio!=='function'||!Number.isSafeInteger(validadeMaximaMs)||
  validadeMaximaMs<1000||validadeMaximaMs>300000)
  throw Error('Validade da verificação inválida');
 const privado=chavePrivada(chavePrivadaConferente);
 const publico=chavePublica(chavePublicaVerificador);
 if(privado.asymmetricKeyType!=='ed25519'||publico.asymmetricKeyType!=='ed25519')
  throw Error('Chaves Ed25519 independentes obrigatórias');
 // Evita usar o mesmo par para verificar a posse e atestar a regularização.
 if(createPublicKey(privado).export({type:'spki',format:'der'}).equals(
    publico.export({type:'spki',format:'der'})))throw Error('Chaves de funções distintas obrigatórias');
 const permitidos=new Set(verificadoresPermitidos);
 return function emitir({recibo,contexto}={}){
  if(!contextoValido(contexto))return null;
  const parsed=objetoAssinado(recibo);
  if(!parsed)return null;
  const {bytes,assinatura,dados:d}=parsed;
  if(!verify(null,Buffer.concat([PREFIXO,bytes]),publico,assinatura)||
    Object.keys(d).sort().join(',')!==CAMPOS_RECIBO.join(',')||
    d.v!==1||d.finalidade!=='posse-independente-whatsapp'||
    d.metodo!=='desafio-confirmado-no-destino'||
    !UUID.test(d.evidenciaId||'')||!UUID.test(d.verificadorId||'')||
    !permitidos.has(d.verificadorId)||d.verificadorId===contexto.operadorId||
    d.verificadorId===conferenteId||contexto.operadorId===conferenteId||
    d.pedidoId!==contexto.pedidoId||d.operadorId!==contexto.operadorId||
    String(d.solicitacaoId)!==String(contexto.solicitacaoId)||
    d.telefoneOriginal!==contexto.telefoneOriginal||
    d.telefoneNovo!==contexto.telefoneNovo||
    !isoValido(d.confirmadoEm))return null;
  const momento=Date.parse(d.confirmadoEm),agora=relogio();
  if(!Number.isSafeInteger(agora)||momento>agora||agora-momento>validadeMaximaMs)
   return null;
  const prova={
   v:1,finalidade:'regularizacao-whatsapp-legado',
   metodo:'desafio-independente-de-posse',evidenciaId:d.evidenciaId,
   conferenteId,pedidoId:contexto.pedidoId,
   solicitacaoId:String(contexto.solicitacaoId),operadorId:contexto.operadorId,
   telefoneOriginal:contexto.telefoneOriginal,telefoneNovo:contexto.telefoneNovo,
   verificadoEm:d.confirmadoEm
  };
  const payloadBytes=Buffer.from(JSON.stringify(prova),'utf8');
  return Object.freeze({
   payload:payloadBytes.toString('base64url'),
   assinatura:sign(null,payloadBytes,privado).toString('base64url')
  });
 };
}
