// Uma única consulta ao Auth valida a sessão e resolve o operador.
// O identificador nunca vem do corpo enviado pelo navegador.
export function criarResolvedorOperadorAdmin({supabaseUrl,chavePublica,idsPermitidos,buscar=fetch}={}) {
 const url=new URL(supabaseUrl||'https://invalid.local');
 if(url.protocol!=='https:'||!/^[a-z0-9]{20}\.supabase\.co$/.test(url.hostname)||
  url.pathname!=='/'||url.search||url.hash)throw Error('URL Supabase inválida');
 if(typeof chavePublica!=='string'||!chavePublica.startsWith('sb_publishable_'))
  throw Error('Chave pública obrigatória');
 if(!Array.isArray(idsPermitidos)||idsPermitidos.length===0||
  idsPermitidos.some(id=>typeof id!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)))
  throw Error('Administradores autorizados obrigatórios');
 const permitidos=new Set(idsPermitidos.map(id=>id.toLowerCase()));
 return async function resolver(token){
  if(typeof token!=='string'||token.length<20||token.length>8192)return null;
  try{
   const resposta=await buscar(url.origin+'/auth/v1/user',{
    method:'GET',headers:{apikey:chavePublica,Authorization:'Bearer '+token,Accept:'application/json'},
    signal:AbortSignal.timeout(4000),redirect:'error'
   });
   if(!resposta.ok)return null;
   const usuario=await resposta.json();
   const id=typeof usuario?.id==='string'?usuario.id.toLowerCase():'';
   return permitidos.has(id)&&usuario.aud==='authenticated'&&!usuario.is_anonymous?id:null;
  }catch{return null;}
 };
}

export function criarVerificadorAdmin({supabaseUrl, chavePublica, idsPermitidos, buscar=fetch}={}) {
 const url=new URL(supabaseUrl || 'https://invalid.local');
 if(url.protocol!=='https:' || !/^[a-z0-9]{20}\.supabase\.co$/.test(url.hostname) || url.pathname!=='/' || url.search || url.hash)
   throw Error('URL Supabase inválida');
 if(typeof chavePublica!=='string'||!chavePublica.startsWith('sb_publishable_'))throw Error('Chave pública obrigatória');
 if(!Array.isArray(idsPermitidos)||!idsPermitidos.length||idsPermitidos.some(id=>typeof id!=='string'||!/^[0-9a-f-]{36}$/i.test(id)))
   throw Error('Lista de administradores autorizados obrigatória');
 const permitidos=new Set(idsPermitidos.map(id=>id.toLowerCase()));
 return async function verificarAdmin(token){
  if(typeof token!=='string'||token.length<20||token.length>8192)return false;
  try{
   const resposta=await buscar(url.origin+'/auth/v1/user',{
    method:'GET',
    headers:{apikey:chavePublica,Authorization:'Bearer '+token,Accept:'application/json'},
    signal:AbortSignal.timeout(4000),
    redirect:'error'
   });
   if(!resposta.ok)return false;
   const usuario=await resposta.json();
   return typeof usuario.id==='string' && permitidos.has(usuario.id.toLowerCase())
     && usuario.aud==='authenticated' && !usuario.is_anonymous;
  }catch{return false;}
 };
}
