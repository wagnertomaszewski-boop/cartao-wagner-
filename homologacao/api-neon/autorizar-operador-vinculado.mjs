// Autorização vinculada: a referência OP-* deve corresponder ao UID da
// sessão autenticada, não apenas a qualquer administrador permitido.
// A tabela UID->referência é configurada exclusivamente no servidor.
export function criarAutorizadorOperadorVinculado({
 supabaseUrl,chavePublica,operadores,buscar=fetch
}={}){
 const url=new URL(supabaseUrl||'https://invalid.local');
 if(url.protocol!=='https:'||!/^[a-z0-9]{20}\.supabase\.co$/.test(url.hostname)||
  url.pathname!=='/'||url.search||url.hash||url.username||url.password)
  throw Error('URL Auth inválida');
 if(typeof chavePublica!=='string'||!chavePublica.startsWith('sb_publishable_'))
  throw Error('Chave pública obrigatória');
 if(!operadores||typeof operadores!=='object'||Array.isArray(operadores)||
  Object.keys(operadores).length===0)throw Error('Vínculos de operadores obrigatórios');
 const mapa=new Map();
 const referencias=new Set();
 for(const [uid,referencia] of Object.entries(operadores)){
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uid)||
   typeof referencia!=='string'||!/^OP-[A-Za-z0-9-]{4,40}$/.test(referencia)||
   referencias.has(referencia))throw Error('Vínculo de operador inválido');
  mapa.set(uid.toLowerCase(),referencia);
  referencias.add(referencia);
 }
 return async function autorizarOperador({tokenOperador,referenciaOperador}={}){
  if(typeof tokenOperador!=='string'||tokenOperador.length<20||tokenOperador.length>8192||
   !referencias.has(referenciaOperador))return false;
  try{
   const resposta=await buscar(url.origin+'/auth/v1/user',{
    method:'GET',headers:{apikey:chavePublica,Authorization:'Bearer '+tokenOperador,Accept:'application/json'},
    signal:AbortSignal.timeout(4000),redirect:'error'
   });
   if(!resposta.ok)return false;
   const usuario=await resposta.json();
   return usuario&&typeof usuario.id==='string'&&usuario.aud==='authenticated'&&
    usuario.is_anonymous===false&&mapa.get(usuario.id.toLowerCase())===referenciaOperador;
  }catch{return false;}
 };
}
