// Integração privada: somente o resultado de conferência executada pelo servidor
// pode gerar o comprovante aceito pelo emissor RPC de homologação.
// Nenhum dado pessoal é transportado no comprovante e nenhuma rota HTTP é criada.
import {criarConferenciaPrivadaAssinada} from './conferencia-privada-assinada.mjs';
import {criarEmissorRpcFicticio} from './emissor-rpc-ficticio.mjs';
export function criarFluxoPrivadoEmissaoRpc({
 conferirIdentidade,autorizarOperador,auditarConferencia,consultarNeon,consultarSupabasePrivado,
 segredoComprovante,auditarTentativa,relogio,gerarNonce
}={}){
 if(typeof autorizarOperador!=='function')throw Error('Autorização privada de operador obrigatória');
 const conferirEAssinar=criarConferenciaPrivadaAssinada({
  conferirIdentidade,auditarConferencia,segredo:segredoComprovante,
  relogio,gerarNonce
 });
 const emissor=criarEmissorRpcFicticio({
  consultarNeon,consultarSupabasePrivado,segredoComprovante,
  auditarTentativa,relogio
 });
 return Object.freeze({
  async emitir({protocolo,referenciaOperador,tokenOperador}={}){
   // Ignora qualquer identidadeConferida, comprovante ou solicitacaoId recebido.
   // A referência do operador não é credencial; autorização deve vir de fonte confiável.
   let autorizado=false;
   try{autorizado=(await autorizarOperador({protocolo,referenciaOperador,tokenOperador}))===true;}
   catch{throw Error('Autorização de operador indisponível');}
   if(!autorizado)throw Error('Operador não autorizado');
   const comprovante=await conferirEAssinar({protocolo,referenciaOperador});
   return emissor.emitir({protocolo,comprovante});
  }
 });
}
