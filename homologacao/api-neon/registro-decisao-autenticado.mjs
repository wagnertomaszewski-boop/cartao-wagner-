// Composição de homologação: vincula UID->OP e força gravação por RPC.
// verificarEvidencia deve ser uma fonte independente e auditável do servidor.
// Nenhuma rota é exposta e nenhuma função SQL é instalada automaticamente.
import {criarAutorizadorOperadorVinculado} from './autorizar-operador-vinculado.mjs';
import {criarRegistradorDecisaoPrivada} from './registrar-decisao-privada.mjs';
import {criarGravadorDecisaoRpc} from './gravador-decisao-rpc.mjs';
export function criarRegistroDecisaoAutenticado({
 supabaseUrl,supabasePublishableKey,operadoresPermitidos,buscarAuth,
 verificarEvidencia,consultarNeon,registrarRpc:registrarRpcConfigurado,auditar,relogio
}={}){
 const autorizarOperador=criarAutorizadorOperadorVinculado({
  supabaseUrl,chavePublica:supabasePublishableKey,
  operadores:operadoresPermitidos,buscar:buscarAuth
 });
 const registrarRpc=registrarRpcConfigurado ?? criarGravadorDecisaoRpc({consultarNeon});
 return criarRegistradorDecisaoPrivada({
  autorizarOperador,verificarEvidencia,registrarRpc,auditar,relogio
 });
}
