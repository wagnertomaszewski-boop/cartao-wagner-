// Atestado de identidade assinado por conferente externo confiável.
// Não gera atestados; só verifica assinatura, vínculo, validade e uso único.
import {createPublicKey,verify} from 'node:crypto';
const ID=/^[1-9][0-9]{0,15}$/;
const B64=/^[A-Za-z0-9_-]+$/;
export function criarVerificadorAtestadoIdentidade({chavePublicaPem,consumirNonce,agora=()=>Date.now(),validadeMaximaMs=300000}={}){
 if(typeof consumirNonce!=='function')throw Error('Armazenamento atômico de nonce obrigatório');
 if(!Number.isSafeInteger(validadeMaximaMs)||validadeMaximaMs<1000||validadeMaximaMs>300000)
  throw Error('Validade de atestado inválida');
 const chave=createPublicKey(chavePublicaPem);
 if(chave.asymmetricKeyType!=='ed25519')throw Error('Conferente deve usar Ed25519');
 return async function confirmar({solicitacaoId,atestado,contexto}={}){
  try{
   if(!ID.test(String(solicitacaoId))||typeof atestado!=='string'||atestado.length>4096)return false;
   const partes=atestado.split('.');
   if(partes.length!==2||!partes.every(p=>B64.test(p)))return false;
   const payloadBytes=Buffer.from(partes[0],'base64url');
   const assinatura=Buffer.from(partes[1],'base64url');
   if(payloadBytes.length>2048||assinatura.length!==64)return false;
   if(!verify(null,payloadBytes,chave,assinatura))return false;
   const p=JSON.parse(payloadBytes.toString('utf8'));
   const momento=agora();
   if(!p||p.v!==1||p.finalidade!=='gestao-chave-privada'||
    String(p.solicitacaoId)!==String(solicitacaoId)||
    !['emitir','revogar'].includes(p.acao)||
    p.acao!==contexto?.acao||
    !Number.isSafeInteger(p.emitidoEm)||!Number.isSafeInteger(p.expiraEm)||
    p.emitidoEm>momento||p.expiraEm<=momento||
    p.expiraEm-p.emitidoEm>validadeMaximaMs||
    typeof p.nonce!=='string'||!/^[a-f0-9]{32,64}$/i.test(p.nonce))return false;
   // Deve inserir nonce em armazenamento persistente com UNIQUE e retornar true só uma vez.
   return await consumirNonce({nonce:p.nonce,solicitacaoId:String(solicitacaoId),expiraEm:p.expiraEm})===true;
  }catch{return false;}
 };
}
