// Montagem do fluxo privado de homologação. Não cria rota nem inicia serviço.
// Não buscar credenciais automaticamente: exigidas somente no processo servidor.
import {criarConsultaPrivadaSupabase} from './consulta-privada-supabase-rest.mjs';
import {criarFluxoPrivadoEmissaoRpc} from './fluxo-privado-emissao-rpc.mjs';
export function criarFluxoPrivadoComSupabase({
 supabaseUrl,supabaseServiceRoleKey,fetchPrivado,
 conferirIdentidade,autorizarOperador,auditarConferencia,
 consultarNeon,segredoComprovante,auditarTentativa,relogio,gerarNonce
}={}){
 const consultarSupabasePrivado=criarConsultaPrivadaSupabase({
  url:supabaseUrl,serviceRoleKey:supabaseServiceRoleKey,fetchPrivado
 });
 return criarFluxoPrivadoEmissaoRpc({
  conferirIdentidade,autorizarOperador,auditarConferencia,
  consultarNeon,consultarSupabasePrivado,segredoComprovante,
  auditarTentativa,relogio,gerarNonce
 });
}
