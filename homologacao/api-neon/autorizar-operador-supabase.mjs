// Autorização de operador por sessão autenticada no Supabase Auth.
// Referência OP-* não é credencial; apenas sessão verificada no servidor autoriza.
// Não registra token, não cria rota e não acessa dados de cidadãos.
import {criarVerificadorAdmin} from './verificar-admin-supabase.mjs';
export function criarAutorizadorOperadorSupabase({supabaseUrl,chavePublica,idsPermitidos,buscar}={}){
 const verificar=criarVerificadorAdmin({supabaseUrl,chavePublica,idsPermitidos,buscar});
 return async function autorizarOperador({tokenOperador,referenciaOperador}={}){
  if(typeof referenciaOperador!=='string'||!/^OP-[A-Za-z0-9-]{4,40}$/.test(referenciaOperador))return false;
  return verificar(tokenOperador);
 };
}
