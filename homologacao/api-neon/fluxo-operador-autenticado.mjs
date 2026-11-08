// Composição restrita: Supabase Auth autoriza operador; Supabase REST consulta
// vínculo protocolo-ID; Neon emite somente por RPC restrita de homologação.
// Não cria endpoint, não lê dados reais durante importação.
import {criarAutorizadorOperadorSupabase} from './autorizar-operador-supabase.mjs';
import {criarFluxoPrivadoComSupabase} from './fluxo-privado-com-supabase.mjs';
export function criarFluxoComOperadorAutenticado({
 supabaseUrl,supabaseProjectRef,supabaseServiceRoleKey,supabasePublishableKey,
 idsOperadoresPermitidos,buscarAuth,fetchPrivado,
 conferirIdentidade,auditarConferencia,consultarNeon,
 segredoComprovante,auditarTentativa,relogio,gerarNonce
}={}){
 const autorizarOperador=criarAutorizadorOperadorSupabase({
  supabaseUrl,chavePublica:supabasePublishableKey,
  idsPermitidos:idsOperadoresPermitidos,buscar:buscarAuth
 });
 return criarFluxoPrivadoComSupabase({
  supabaseUrl,supabaseProjectRef,supabaseServiceRoleKey,fetchPrivado,
  autorizarOperador,conferirIdentidade,auditarConferencia,
  consultarNeon,segredoComprovante,auditarTentativa,relogio,gerarNonce
 });
}
