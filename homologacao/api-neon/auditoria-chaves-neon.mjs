// Registro de auditoria atômico. Não contém chave em texto claro nem hash.
// A conexão de homologação não recebe privilégios diretos de escrita.
const SQL='INSERT INTO mandato_chaves_homologacao.auditoria_chaves (solicitacao_id,operador_id,acao,revogadas) VALUES ($1::bigint,$2::uuid,$3::text,$4::integer)';
export function criarAuditorChavesNeon() {
 return async function auditar({tx,acao,solicitacaoId,operadorId,revogadas}={}) {
  if(!tx||typeof tx.queryAuditoria!=='function')throw Error('Auditoria transacional obrigatória');
  if(!['emitir','revogar'].includes(acao)||!Number.isSafeInteger(revogadas)||revogadas<0||revogadas>1)
   throw Error('Dados de auditoria inválidos');
  const r=await tx.queryAuditoria(SQL,[String(solicitacaoId),operadorId,acao,revogadas]);
  if(r?.rowCount!==1)throw Error('Auditoria não persistida');
 };
}
