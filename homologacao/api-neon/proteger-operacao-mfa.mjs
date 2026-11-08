// Proteção MFA para operações administrativas sensíveis.
// O operador é resolvido pela sessão Supabase, nunca pelo corpo da requisição.
export function protegerOperacaoComMfa({resolverOperador,verificarMfa,executar}={}){
 if([resolverOperador,verificarMfa,executar].some(fn=>typeof fn!=='function'))
  throw Error('Dependências de autenticação obrigatórias');
 return async function operacaoProtegida({dados,token}={}){
  if(typeof token!=='string'||!token)return {erro:'MFA obrigatório',autorizado:false};
  try{
   const operadorId=await resolverOperador(token);
   if(!operadorId)return {erro:'Sessão administrativa inválida',autorizado:false};
   const prova=await verificarMfa({operadorId,token});
   if(prova?.confirmado!==true||prova.operadorId!==operadorId||
    !Number.isSafeInteger(prova.confirmadoEm))
    return {erro:'Reautenticação MFA necessária',autorizado:false};
   return await executar({dados,operadorId,token,confirmadoEm:prova.confirmadoEm});
  }catch{return {erro:'Autorização indisponível',autorizado:false};}
 };
}
