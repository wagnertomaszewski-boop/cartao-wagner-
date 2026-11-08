// Fonte independente de evidência: atestado Ed25519 de conferente externo.
// A chave privada NUNCA pertence ao emissor; só a chave pública fica aqui.
// Atestado é dado do servidor, nunca um checkbox ou documento do cidadão.
import {createPublicKey,verify} from 'node:crypto';
const rx=/^[A-Za-z0-9-]{1,80}$/;
function base64url(s){return typeof s==='string'&&/^[A-Za-z0-9_-]{64,256}$/.test(s);}
export function criarFonteEvidenciaAssinada({
 chavePublicaConferente,buscarAtestado,conferentesPermitidos,relogio=()=>Date.now(),
 validadeMs=15*60*1000
}={}){
 if(typeof buscarAtestado!=='function'||typeof relogio!=='function'||
  !Number.isSafeInteger(validadeMs)||validadeMs<1||validadeMs>15*60*1000)
  throw Error('Fonte independente obrigatória');
 if(!Array.isArray(conferentesPermitidos)||conferentesPermitidos.length===0||
  !conferentesPermitidos.every(x=>typeof x==='string'&&/^REV-[A-Za-z0-9-]{4,40}$/.test(x)))
  throw Error('Conferentes permitidos obrigatórios');
 const conferentes=new Set(conferentesPermitidos);
 const chave=chavePublicaConferente?.type==='public' ? chavePublicaConferente : createPublicKey(chavePublicaConferente);
 if(chave.asymmetricKeyType!=='ed25519')throw Error('Chave Ed25519 obrigatória');
 return async function verificarEvidencia({protocolo,referenciaOperador,registroId}={}){
  if(![protocolo,referenciaOperador,registroId].every(x=>typeof x==='string'&&rx.test(x))||
   !/^OP-[A-Za-z0-9-]{4,40}$/.test(referenciaOperador)||
   registroId.length<8||protocolo.length>40)return null;
  let atestado;
  try{atestado=await buscarAtestado({protocolo,referenciaOperador,registroId});}
  catch{return null;}
  if(!atestado||typeof atestado!=='object'||Array.isArray(atestado)||
   !base64url(atestado.assinatura)||!atestado.dados||
   typeof atestado.dados!=='object'||Array.isArray(atestado.dados))return null;
  const d=atestado.dados;
  if(Object.keys(d).sort().join(',')!==
   'conferenteId,identidadeConfirmada,operador,protocolo,registroId,verificada,verificadaEmMs')
   return null;
  if(d.protocolo!==protocolo||d.operador!==referenciaOperador||
   d.registroId!==registroId||d.verificada!==true||d.identidadeConfirmada!==true||
   typeof d.conferenteId!=='string'||!/^REV-[A-Za-z0-9-]{4,40}$/.test(d.conferenteId)||
   !conferentes.has(d.conferenteId)||
   d.conferenteId==='REV-'+referenciaOperador.slice(3))return null;
  const agora=relogio();
  if(!Number.isSafeInteger(agora)||!Number.isSafeInteger(d.verificadaEmMs)||
   d.verificadaEmMs>agora||agora-d.verificadaEmMs>validadeMs)return null;
  const mensagem=Buffer.from(JSON.stringify([
   'mandato-evidencia-v1',d.protocolo,d.operador,d.registroId,
   d.conferenteId,d.verificada,d.identidadeConfirmada,d.verificadaEmMs
  ]),'utf8');
  try{
   if(!verify(null,mensagem,chave,Buffer.from(atestado.assinatura,'base64url')))return null;
  }catch{return null;}
  return Object.freeze({
   protocolo,operador:referenciaOperador,registroId,
   verificada:true,identidadeConfirmada:true,verificadaEmMs:d.verificadaEmMs
  });
 };
}
