// A operação só prepara a mensagem depois de autenticar o operador e validar
// uma autorização independente de recuperação. Não emite chaves nem atestados.
export function criarInicioRecuperacaoManual({resolverOperador,autorizarRecuperacao,verificacao}={}){
 if(typeof resolverOperador!=='function'||typeof autorizarRecuperacao!=='function'||
  typeof verificacao?.solicitar!=='function')throw Error('Integrações privadas obrigatórias');
 return async function iniciar({dados,token}={}){
  if(!dados||!/^[1-9][0-9]{0,15}$/.test(String(dados.solicitacaoId))||
   !['emitir','revogar'].includes(dados.acao))throw Error('Solicitação inválida');
  const operadorId=await resolverOperador(token);
  if(!operadorId)throw Error('Administrador não autenticado');
  if(await autorizarRecuperacao({operadorId,solicitacaoId:String(dados.solicitacaoId),acao:dados.acao})!==true)
   throw Error('Recuperação não autorizada');
  const resultado=await verificacao.solicitar({solicitacaoId:String(dados.solicitacaoId),acao:dados.acao});
  if(!resultado?.envioManual?.url)throw Error('Envio manual indisponível');
  return resultado;
 };
}
