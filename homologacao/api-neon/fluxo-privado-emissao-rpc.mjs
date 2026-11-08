// Integração privada: somente o resultado de conferência executada pelo servidor
// pode gerar o comprovante aceito pelo emissor RPC de homologação.
// Nenhum dado pessoal é transportado no comprovante e nenhuma rota HTTP é criada.
import {criarConferenciaPrivadaAssinada} from './conferencia-privada-assinada.mjs';
import {criarEmissorRpcFicticio} from './emissor-rpc-ficticio.mjs';
export function criarFluxoPrivadoEmissaoRpc({
 conferirIdentidade,auditarConferencia,consultarNeon,consultarSupabasePrivado,
 segredoComprovante,auditarTentativa,relogio,gerarNonce
}={}){
 const conferirEAssinar=criarConferenciaPrivadaAssinada({
  conferirIdentidade,auditarConferencia,segredo:segredoComprovante,
  relogio,gerarNonce
 });
 const emissor=criarEmissorRpcFicticio({
  consultarNeon,consultarSupabasePrivado,segredoComprovante,
  auditarTentativa,relogio
 });
 return Object.freeze({
  async emitir({protocolo,referenciaOperador}={}){
   // Ignora qualquer identidadeConferida, comprovante ou solicitacaoId recebido.
   const comprovante=await conferirEAssinar({protocolo,referenciaOperador});
   return emissor.emitir({protocolo,comprovante});
  }
 });
}
