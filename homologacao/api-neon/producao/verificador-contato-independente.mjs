// Candidata isolada: comprova a posse do NOVO WhatsApp por atestado externo assinado.
// A API de atendimento recebe somente a chave PUBLICA do conferente. Nunca cria provas.
// A fonte é consultada no servidor; nenhuma declaração/atestado da tela é confiável.
import {createPublicKey,verify} from 'node:crypto';

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const E164LEGADO=/^\+55[1-9]\d{9,10}$/;
const E164MOVEL=/^\+55[1-9]\d{10}$/;
const B64=/^[A-Za-z0-9_-]+$/;
const CAMPOS=['conferenteId','evidenciaId','finalidade','metodo','operadorId','pedidoId','solicitacaoId','telefoneNovo','telefoneOriginal','v','verificadoEm'];

/**
 * @param {{chavePublicaConferente?: any, conferentesPermitidos?: string[],
 * buscarAtestado?: (contexto: {pedidoId:string, solicitacaoId:string},executor?:any)=>Promise<any>,
 * relogio?: ()=>number, validadeMaximaMs?:number}} config
 */
export function criarVerificadorContatoIndependente({
 chavePublicaConferente,conferentesPermitidos,buscarAtestado,relogio=()=>Date.now(),
 validadeMaximaMs=300000
}={}){
 if(typeof buscarAtestado!=='function'||typeof relogio!=='function')throw Error('Fonte privada de atestados obrigatória');
 if(!Number.isSafeInteger(validadeMaximaMs)||validadeMaximaMs<1000||validadeMaximaMs>300000)throw Error('Prazo da prova inválido');
 if(!Array.isArray(conferentesPermitidos)||conferentesPermitidos.length===0||
   !conferentesPermitidos.every(x=>typeof x==='string'&&UUID.test(x)))
   throw Error('Identidades de conferentes independentes obrigatórias');
 const permitidos=new Set(conferentesPermitidos);
 const chave=chavePublicaConferente?.type==='public' ? chavePublicaConferente : createPublicKey(chavePublicaConferente);
 if(chave.asymmetricKeyType!=='ed25519')throw Error('Chave pública Ed25519 obrigatória');

 return async function validarRegularizacaoContato(contexto={}){
  const {pedidoId,solicitacaoId,operadorId,telefoneOriginal,telefoneNovo,executorConsulta}=contexto;
  if(!UUID.test(pedidoId||'')||!UUID.test(operadorId||'')||
     !/^[1-9]\d{0,15}$/.test(String(solicitacaoId))||
     !E164LEGADO.test(telefoneOriginal||'')||!E164MOVEL.test(telefoneNovo||''))return null;
  try{
   // Somente o backend acessa esta fonte privada, nunca o navegador.
   const atestado=await buscarAtestado({pedidoId,solicitacaoId:String(solicitacaoId)},executorConsulta);
   if(!atestado||typeof atestado!=='object'||Array.isArray(atestado)||
     typeof atestado.payload!=='string'||atestado.payload.length>2048||
     typeof atestado.assinatura!=='string'||atestado.assinatura.length>128||
     !B64.test(atestado.payload)||!B64.test(atestado.assinatura))return null;
   const bytes=Buffer.from(atestado.payload,'base64url');
   const assinatura=Buffer.from(atestado.assinatura,'base64url');
   if(bytes.length>1400||assinatura.length!==64||
     !verify(null,bytes,chave,assinatura))return null;
   const dados=JSON.parse(bytes.toString('utf8'));
   if(!dados||typeof dados!=='object'||Array.isArray(dados)||
     Object.keys(dados).sort().join(',')!==CAMPOS.join(','))return null;
   if(dados.v!==1||dados.finalidade!=='regularizacao-whatsapp-legado'||
     dados.metodo!=='desafio-independente-de-posse'||
     !UUID.test(dados.evidenciaId||'')||!UUID.test(dados.conferenteId||'')||
     !permitidos.has(dados.conferenteId)||dados.conferenteId===operadorId||
     dados.pedidoId!==pedidoId||String(dados.solicitacaoId)!==String(solicitacaoId)||
     dados.operadorId!==operadorId||
     dados.telefoneOriginal!==telefoneOriginal||dados.telefoneNovo!==telefoneNovo)return null;
   if(typeof dados.verificadoEm!=='string'||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(dados.verificadoEm))return null;
   const momento=Date.parse(dados.verificadoEm),agora=relogio();
   if(!Number.isSafeInteger(agora)||!Number.isFinite(momento)||
     new Date(momento).toISOString()!==dados.verificadoEm||
     momento>agora||agora-momento>validadeMaximaMs)return null;
   // Replay entre pedidos é barrado adicionalmente por UNIQUE(evidencia_id) no SQL.
   return Object.freeze({
    validado:true,evidenciaId:dados.evidenciaId,verificadoEm:dados.verificadoEm,
    pedidoId,solicitacaoId:String(solicitacaoId),operadorId,telefoneOriginal,telefoneNovo
   });
  }catch{return null;}
 };
}
