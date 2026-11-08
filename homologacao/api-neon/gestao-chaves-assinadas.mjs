// Integra verificação Ed25519 e escrita atômica, sem reutilizar a conta de consulta.
// O nonce só é consumido pela RPC, na mesma transação da chave e da auditoria.
import {criarVerificadorAtestadoIdentidade} from './verificar-atestado-identidade.mjs';
import {criarExecutorRpcChavesNeon} from './executor-rpc-chaves-neon.mjs';
import {emitirChavePrivada} from './chaves-privadas.mjs';
const ID=/^[1-9][0-9]{0,15}$/;
export function criarGestaoChavesAssinadas({chavePublicaPem,poolEscrita,operadorPermitido,agora}={}){
 if(typeof operadorPermitido!=='function')throw Error('Autorização administrativa obrigatória');
 const confirmar=criarVerificadorAtestadoIdentidade({
  chavePublicaPem,agora,
  // Não consumir antes da RPC: a função PostgreSQL faz isso atomicamente.
  consumirNonce:async()=>true
 });
 const executarRpc=criarExecutorRpcChavesNeon({pool:poolEscrita});
 async function executar(acao,{solicitacaoId,operadorId,atestado,contexto}={}){
  if(!ID.test(String(solicitacaoId))||!['emitir','revogar'].includes(acao))throw Error('Solicitação inválida');
  if(await operadorPermitido({operadorId,acao,solicitacaoId:String(solicitacaoId)})!==true)
   throw Error('Operador não autorizado');
  if(await confirmar({solicitacaoId,atestado,contexto:{acao}})!==true)
   throw Error('Identidade não confirmada');
  const p=JSON.parse(Buffer.from(atestado.split('.')[0],'base64url').toString('utf8'));
  const chave=acao==='emitir'?emitirChavePrivada():null;
  await executarRpc({
   solicitacaoId:String(solicitacaoId),operadorId,acao,
   hash:chave?.hash??null,nonce:p.nonce,expiraEm:p.expiraEm
  });
  return acao==='emitir'?{chave:chave.chave,emitida:true}:{revogada:true};
 }
 return Object.freeze({
  emitir:entrada=>executar('emitir',entrada),
  revogar:entrada=>executar('revogar',entrada)
 });
}
