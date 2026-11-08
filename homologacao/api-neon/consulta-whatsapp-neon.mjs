// Consulta privada, somente leitura, ao registro de WhatsApp no Neon de homologação.
// Não comprova identidade sozinha e não aceita estado de confirmação do navegador.
const ID=/^[1-9][0-9]{0,15}$/;
export function criarConsultaWhatsappNeon({pool}={}){
 if(typeof pool?.query!=='function')throw Error('Pool de leitura Neon obrigatório');
 return async function consultarWhatsappConfirmado({solicitacaoId,acao}={}){
  if(!ID.test(String(solicitacaoId))||!['emitir','revogar'].includes(acao))return {confirmado:false};
  try{
   const resultado=await pool.query(`
    SELECT c.solicitacao_id::text AS solicitacao_id
    FROM mandato_chaves_homologacao.confirmacoes_whatsapp c
    JOIN mandato_chaves_homologacao.desafios_whatsapp d
      ON d.id=c.desafio_id AND d.solicitacao_id=c.solicitacao_id AND d.acao=c.acao
    WHERE c.solicitacao_id=$1::bigint
      AND c.acao=$2::text
      AND c.confirmado_em IS NOT NULL
      AND d.consumido_em IS NOT NULL
      AND c.confirmado_em >= now()-interval '15 minutes'
    ORDER BY c.confirmado_em DESC LIMIT 1`,[String(solicitacaoId),acao]);
   return {confirmado:resultado.rows?.[0]?.solicitacao_id===String(solicitacaoId),
    solicitacaoId:String(solicitacaoId)};
  }catch{return {confirmado:false};}
 };
}
