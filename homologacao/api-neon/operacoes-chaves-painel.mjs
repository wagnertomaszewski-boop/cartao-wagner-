// Ponte entre sessão do Painel e gestor de chaves. Não publica rotas por conta própria.
// Atestado de identidade deve ser conferido pelo gestor no servidor.
export function criarOperacoesChavesPainel({resolverOperador,gestor}={}) {
 if(typeof resolverOperador!=='function'||typeof gestor?.emitir!=='function'||typeof gestor?.revogar!=='function')
  throw Error('Integrações administrativas obrigatórias');
 const ID=/^[1-9][0-9]{0,15}$/;
 async function executar(acao,{dados,token}={}) {
  if(!dados||typeof dados!=='object'||Array.isArray(dados)||
   !ID.test(String(dados.solicitacaoId))||
   typeof dados.atestado!=='string'||dados.atestado.length<16||dados.atestado.length>4096)
   throw Error('Requisição inválida');
  if(typeof token!=='string'||token.length<20||token.length>8192)throw Error('Sessão inválida');
  // O operador é obtido exclusivamente do servidor de autenticação.
  const operadorId=await resolverOperador(token);
  if(!operadorId)throw Error('Operador não autorizado');
  return gestor[acao]({
   solicitacaoId:String(dados.solicitacaoId),
   operadorId,
   atestado:dados.atestado,
   contexto:{origem:'painel'}
  });
 }
 return Object.freeze({
  emitir:entrada=>executar('emitir',entrada),
  revogar:entrada=>executar('revogar',entrada)
 });
}
