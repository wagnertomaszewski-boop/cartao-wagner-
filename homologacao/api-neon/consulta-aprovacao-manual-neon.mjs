// Leitura privada de aprovações manuais. A role deve receber somente SELECT
// depois da instalação de uma rotina autenticada de escrita e auditoria.
const ID=/^[1-9][0-9]{0,15}$/;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function criarConsultaAprovacaoManualNeon({pool}={}){
 if(typeof pool?.query!=='function')throw Error('Pool privado obrigatório');
 return async function consultarConferenciaPessoal({solicitacaoId,operadorId,acao}={}){
  if(!ID.test(String(solicitacaoId))||!UUID.test(String(operadorId))||!['emitir','revogar'].includes(acao))
   return {confirmado:false};
  try{
   const resultado=await pool.query(`
    SELECT solicitacao_id::text AS solicitacao_id, operador_id::text AS operador_id, justificativa
    FROM mandato_chaves_homologacao.aprovacoes_manuais
    WHERE solicitacao_id=$1::bigint AND operador_id=$2::uuid AND acao=$3::text
      AND revogada_em IS NULL AND expira_em>now() AND aprovada_em<=now()
    ORDER BY aprovada_em DESC LIMIT 1`,[String(solicitacaoId),operadorId,acao]);
   const row=resultado.rows?.[0];
   return {confirmado:row?.solicitacao_id===String(solicitacaoId)&&row?.operador_id===operadorId,
    solicitacaoId:String(solicitacaoId),operadorId,justificativa:row?.justificativa};
  }catch{return {confirmado:false};}
 };
}
