// Ponte administrativa: o navegador nunca informa operadorId, hash ou nonce.
export function criarConclusaoRecuperacaoPainel({resolverOperador,recuperar}={}){
 if(typeof resolverOperador!=='function'||typeof recuperar!=='function')throw Error('Dependências privadas obrigatórias');
 return async function concluir({dados,token}={}){
  if(!dados||!/^[1-9][0-9]{0,15}$/.test(String(dados.solicitacaoId))||
   typeof dados.desafioId!=='string'||!/^[a-f0-9]{32}$/.test(dados.desafioId)||
   typeof dados.atestado!=='string'||dados.atestado.length<16||dados.atestado.length>4096)
   throw Error('Dados inválidos');
  if(typeof token!=='string'||token.length<20||token.length>8192)throw Error('Sessão inválida');
  const operadorId=await resolverOperador(token);
  if(!operadorId)throw Error('Operador não autenticado');
  return recuperar({solicitacaoId:String(dados.solicitacaoId),desafioId:dados.desafioId,atestado:dados.atestado,operadorId});
 };
}
