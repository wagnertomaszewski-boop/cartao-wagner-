// Fluxo de decisão persistida exige vínculo exato entre sessão UID e operador.
// Fonte de decisão vem exclusivamente da RPC privada do Neon.
import {criarFonteDecisaoNeon} from './fonte-decisao-neon.mjs';
import {criarConferidorManualAuditado} from './conferidor-manual-auditado.mjs';
import {criarAutorizadorOperadorVinculado} from './autorizar-operador-vinculado.mjs';
import {criarFluxoPrivadoComSupabase} from './fluxo-privado-com-supabase.mjs';
export function criarFluxoComDecisaoPersistida({
 consultarNeon,supabaseUrl,supabasePublishableKey,operadoresPermitidos,buscarAuth,
 ...config
}={}){
 const consultarDecisao=criarFonteDecisaoNeon({consultar:consultarNeon});
 const conferirIdentidade=criarConferidorManualAuditado({consultarDecisao,relogio:config.relogio});
 const autorizarOperador=criarAutorizadorOperadorVinculado({
  supabaseUrl,chavePublica:supabasePublishableKey,
  operadores:operadoresPermitidos,buscar:buscarAuth
 });
 return criarFluxoPrivadoComSupabase({
  ...config,supabaseUrl,consultarNeon,conferirIdentidade,autorizarOperador
 });
}
