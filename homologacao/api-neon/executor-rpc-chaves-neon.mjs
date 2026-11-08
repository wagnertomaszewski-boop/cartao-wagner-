// Executor da RPC atômica de homologação. Exige pool de escrita exclusivo.
// O servidor deve verificar assinatura, ação, identidade e operador ANTES da chamada.
const SQL='SELECT revogadas,auditorias FROM mandato_chaves_homologacao.aplicar_chave_privada($1::bigint,$2::uuid,$3::text,$4::bytea,$5::text,to_timestamp($6::double precision/1000.0))';
export function criarExecutorRpcChavesNeon({pool}={}){
 if(typeof pool?.query!=='function')throw Error('Pool de escrita exclusivo obrigatório');
 return async function executar({solicitacaoId,operadorId,acao,hash,nonce,expiraEm}={}){
  if(!/^[1-9][0-9]{0,15}$/.test(String(solicitacaoId))||
   !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(operadorId))||
   !['emitir','revogar'].includes(acao)||
   (acao==='emitir'?!(Buffer.isBuffer(hash)&&hash.length===32):hash!==null)||
   typeof nonce!=='string'||!/^[a-f0-9]{32,64}$/.test(nonce)||
   !Number.isSafeInteger(expiraEm))throw Error('Parâmetros de escrita inválidos');
  const r=await pool.query(SQL,[String(solicitacaoId),operadorId,acao,hash,nonce,expiraEm]);
  if(r?.rowCount!==1||r.rows?.[0]?.auditorias!==1)throw Error('Auditoria não confirmada');
  return {revogadas:Number(r.rows[0].revogadas),auditorias:1};
 };
}
