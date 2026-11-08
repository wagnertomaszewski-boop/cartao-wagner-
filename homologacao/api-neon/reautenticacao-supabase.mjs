// Verifica token com Supabase Auth antes de usar claims. Exige MFA (aal2)
// e auth_time recente; um login antigo ou simples refresh não basta.
export function criarVerificadorReautenticacaoSupabase({
 supabaseUrl,chavePublica,idsPermitidos,buscar=fetch,agora=()=>Date.now()
}={}){
 const url=new URL(supabaseUrl||'https://invalid.local');
 if(url.protocol!=='https:'||!/^[a-z0-9]{20}\.supabase\.co$/.test(url.hostname)||url.pathname!=='/'||url.search||url.hash)
  throw Error('URL Supabase inválida');
 if(typeof chavePublica!=='string'||!chavePublica.startsWith('sb_publishable_'))throw Error('Chave pública obrigatória');
 if(!Array.isArray(idsPermitidos)||!idsPermitidos.length)throw Error('Operadores permitidos obrigatórios');
 const permitidos=new Set(idsPermitidos.map(id=>id.toLowerCase()));
 return async function consultarReautenticacao({operadorId,token}={}){
  const negado={confirmado:false};
  if(typeof token!=='string'||token.length<20||token.length>8192||!permitidos.has(String(operadorId).toLowerCase()))return negado;
  try{
   const resposta=await buscar(url.origin+'/auth/v1/user',{
    method:'GET',headers:{apikey:chavePublica,Authorization:'Bearer '+token,Accept:'application/json'},
    redirect:'error',signal:AbortSignal.timeout(4000)
   });
   if(!resposta.ok)return negado;
   const usuario=await resposta.json();
   if(usuario?.id?.toLowerCase()!==operadorId.toLowerCase()||usuario.aud!=='authenticated'||usuario.is_anonymous)return negado;
   const partes=token.split('.');
   if(partes.length!==3)return negado;
   const claims=JSON.parse(Buffer.from(partes[1],'base64url').toString('utf8'));
   const tempo=agora(),confirmadoEm=claims.auth_time*1000;
   if(claims.sub?.toLowerCase()!==operadorId.toLowerCase()||claims.aal!=='aal2'||
    !Number.isSafeInteger(tempo)||!Number.isSafeInteger(confirmadoEm)||
    confirmadoEm>tempo||tempo-confirmadoEm>300000||
    !Number.isSafeInteger(claims.exp)||claims.exp*1000<=tempo)return negado;
   return {confirmado:true,operadorId,confirmadoEm};
  }catch{return negado;}
 };
}
