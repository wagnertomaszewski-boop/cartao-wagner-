// Conferência manual assistida: somente evidência verificada por operador
// autenticado e vinculada ao protocolo. Nenhum documento ou CPF é retornado.
// A fonte é obrigatoriamente interna; falha fechada sem decisão registrada.
export function criarConferidorManualAuditado({consultarDecisao,relogio=()=>Date.now(),janelaMs=24*60*60*1000}={}){
 if(typeof consultarDecisao!=='function'||typeof relogio!=='function'||
  !Number.isSafeInteger(janelaMs)||janelaMs<1)throw Error('Fonte de decisão interna obrigatória');
 return async function conferirIdentidade({protocolo,referenciaOperador}={}){
  if(typeof protocolo!=='string'||!/^[A-Za-z0-9-]{1,40}$/.test(protocolo)||
   typeof referenciaOperador!=='string'||!/^OP-[A-Za-z0-9-]{4,40}$/.test(referenciaOperador))
   return false;
  let decisao;
  try{decisao=await consultarDecisao({protocolo,referenciaOperador});}
  catch{return false;}
  if(!decisao||typeof decisao!=='object'||Array.isArray(decisao))return false;
  const agora=relogio();
  return decisao.protocolo===protocolo&&
   decisao.operador===referenciaOperador&&
   decisao.identidadeVerificada===true&&
   decisao.evidenciaConferida===true&&
   decisao.status==='aprovado'&&
   typeof decisao.registroId==='string'&&/^[A-Za-z0-9-]{8,80}$/.test(decisao.registroId)&&
   Number.isSafeInteger(decisao.decididoEmMs)&&
   Number.isSafeInteger(agora)&&decisao.decididoEmMs<=agora&&
   agora-decisao.decididoEmMs<=janelaMs;
 };
}
