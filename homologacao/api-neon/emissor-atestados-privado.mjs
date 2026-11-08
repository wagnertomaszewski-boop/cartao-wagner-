// Serviço emissor privado. Não expor como rota pública sem verificação independente
// de identidade, autenticação administrativa e proteção contra replay.
// A chave privada deve existir apenas em armazenamento secreto do emissor.
import {createPrivateKey,randomBytes,sign} from 'node:crypto';
import {validarConferenciaManual} from './politica-conferencia-manual.mjs';
const ID=/^[1-9][0-9]{0,15}$/;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function criarEmissorAtestados({chavePrivadaPem,confirmarIdentidadeIndependente,autorizarOperador,agora=()=>Date.now()}={}){
 if(typeof confirmarIdentidadeIndependente!=='function'||typeof autorizarOperador!=='function')
  throw Error('Verificação independente e autorização obrigatórias');
 const chave=createPrivateKey(chavePrivadaPem);
 if(chave.asymmetricKeyType!=='ed25519')throw Error('Chave de assinatura Ed25519 obrigatória');
 return async function emitir({solicitacaoId,operadorId,acao,evidencia}={}){
  if(!ID.test(String(solicitacaoId))||!UUID.test(String(operadorId))||!['emitir','revogar'].includes(acao)||
   typeof evidencia!=='string'||evidencia.length<16||evidencia.length>2048)
   throw Error('Solicitação de atestado inválida');
  const pedido={solicitacaoId:String(solicitacaoId),operadorId,acao,evidencia};
  if(await autorizarOperador(pedido)!==true)throw Error('Operador não autorizado');
  const conferencia=await confirmarIdentidadeIndependente(pedido);
  if(!validarConferenciaManual({...conferencia,solicitacaoId:String(solicitacaoId),operadorId}))throw Error('Identidade não comprovada');
  const emitidoEm=agora();
  if(!Number.isSafeInteger(emitidoEm))throw Error('Relógio inválido');
  const dados={v:1,finalidade:'gestao-chave-privada',solicitacaoId:String(solicitacaoId),
   operadorId,acao,emitidoEm,expiraEm:emitidoEm+120000,nonce:randomBytes(24).toString('hex')};
  const bytes=Buffer.from(JSON.stringify(dados));
  return bytes.toString('base64url')+'.'+sign(null,bytes,chave).toString('base64url');
 };
}
