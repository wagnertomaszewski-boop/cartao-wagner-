// Reutiliza a validação de identidade; claims só são lidos após aceitação pelo Auth.
import {criarResolvedorOperadorAdmin} from '../verificar-admin-supabase.mjs';
export function criarResolvedorMfaRecente(params){
 criarResolvedorOperadorAdmin(params); // Confere configuração antes de receber pedidos.
 const agora=params.agora||(()=>Date.now()),buscar=params.buscar||fetch;
 return async token=>{
  // O usuário verificado pertence somente a esta chamada, inclusive sob concorrência.
  // Reutiliza a mesma resposta /user, sem repetir a consulta ao Auth.
  let usuarioAtual=null;
  const resolver=criarResolvedorOperadorAdmin({...params,buscar:async(...args)=>{
   const r=await buscar(...args);if(!r.ok)return r;
   usuarioAtual=await r.json();return {ok:true,json:async()=>usuarioAtual};
  }});
  const usuarioId=await resolver(token);if(!usuarioId)return null;
  try{
   const claims=JSON.parse(Buffer.from(token.split('.')[1],'base64url')),tempo=agora();
   const metodos=Array.isArray(claims.amr)?claims.amr:[];
   // getUser aceita alguns JWTs ainda não expirados após logout; conferir a sessão.
   if(!/^[0-9a-f-]{36}$/i.test(claims.session_id||'')||typeof params.sessaoAtiva!=='function'||!await params.sessaoAtiva(usuarioId,claims.session_id))return null;
   // Uma prova antiga não substitui o fator ainda verificado no estado atual do Auth.
   const fatorAtual=Array.isArray(usuarioAtual?.factors)&&usuarioAtual.factors.some(f=>f.factor_type==='totp'&&f.status==='verified');
   const alterada=Date.parse(usuarioAtual?.updated_at||'');
   const contaAtual=Number.isFinite(alterada)&&Number.isSafeInteger(claims.iat)&&claims.iat*1000<=tempo&&claims.iat>=Math.floor(alterada/1000);
   const recente=metodos.some(a=>a.method==='totp'&&Number.isSafeInteger(a.timestamp)&&a.timestamp*1000<=tempo&&tempo-a.timestamp*1000<300000);
   return {usuarioId,mfaRecente:claims.sub===usuarioId&&claims.aal==='aal2'&&Number.isSafeInteger(claims.exp)&&claims.exp*1000>tempo&&recente&&fatorAtual&&contaAtual};
  }catch{return {usuarioId,mfaRecente:false};}
 };
}
