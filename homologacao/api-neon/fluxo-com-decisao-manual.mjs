// Integra a conferência manual registrada ao fluxo com operador autenticado.
// consultarDecisao deve ser uma fonte privada auditável, não dados do cliente.
// Sem fonte, configuração falha; sem decisão, emissão falha.
import {criarConferidorManualAuditado} from './conferidor-manual-auditado.mjs';
import {criarFluxoComOperadorAutenticado} from './fluxo-operador-autenticado.mjs';
export function criarFluxoComDecisaoManual({
 consultarDecisao,supabaseUrl,supabaseProjectRef,supabaseServiceRoleKey,
 supabasePublishableKey,idsOperadoresPermitidos,buscarAuth,fetchPrivado,
 auditarConferencia,consultarNeon,segredoComprovante,
 auditarTentativa,relogio,gerarNonce
}={}){
 const conferirIdentidade=criarConferidorManualAuditado({consultarDecisao,relogio});
 return criarFluxoComOperadorAutenticado({
  supabaseUrl,supabaseProjectRef,supabaseServiceRoleKey,supabasePublishableKey,
  idsOperadoresPermitidos,buscarAuth,fetchPrivado,conferirIdentidade,
  auditarConferencia,consultarNeon,segredoComprovante,
  auditarTentativa,relogio,gerarNonce
 });
}
