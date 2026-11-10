// Reutiliza a validação de sessão existente; AMR é lido só após aceitação pelo Auth.
import {criarResolvedorOperadorAdmin} from '../verificar-admin-supabase.mjs';
export function criarResolvedorMfaRecente(params){const resolver=criarResolvedorOperadorAdmin(params),agora=params.agora||(()=>Date.now());return async token=>{
 const usuarioId=await resolver(token);if(!usuarioId)return null;
 try{const claims=JSON.parse(Buffer.from(token.split('.')[1],'base64url'));const tempo=agora(),metodos=Array.isArray(claims.amr)?claims.amr:[];
 const recente=metodos.some(a=>a.method==='totp'&&Number.isSafeInteger(a.timestamp)&&a.timestamp*1000<=tempo&&tempo-a.timestamp*1000<300000);
 return {usuarioId,mfaRecente:claims.sub===usuarioId&&claims.aal==='aal2'&&Number.isSafeInteger(claims.exp)&&claims.exp*1000>tempo&&recente};
 }catch{return {usuarioId,mfaRecente:false};}
};}
