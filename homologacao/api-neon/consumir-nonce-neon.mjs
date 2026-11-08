// Persistência de uso único de atestados, usando conexão de escrita separada.
// A role de consulta privada NÃO deve receber INSERT nesta tabela.
const SQL=`INSERT INTO mandato_chaves_homologacao.nonces_atestados
 (nonce,solicitacao_id,expira_em)
 SELECT $1::text,$2::bigint,to_timestamp($3::double precision/1000.0)
 WHERE to_timestamp($3::double precision/1000.0)>now()
 ON CONFLICT (nonce) DO NOTHING
 RETURNING nonce`;
export function criarConsumidorNonceNeon({pool}={}){
 if(typeof pool?.query!=='function')throw Error('Conexão privada de escrita obrigatória');
 return async function consumirNonce({nonce,solicitacaoId,expiraEm}={}){
  if(typeof nonce!=='string'||!/^[a-f0-9]{32,64}$/i.test(nonce)||
   !/^[1-9][0-9]{0,15}$/.test(String(solicitacaoId))||
   !Number.isSafeInteger(expiraEm))return false;
  const resultado=await pool.query(SQL,[nonce.toLowerCase(),String(solicitacaoId),expiraEm]);
  return resultado?.rowCount===1;
 };
}
