// Adaptador de persistência para ambiente ISOLADO de homologação.
// A conexão recebida deve ser uma transação do backend com papel autorizado
// e política RLS específica. Não usar pool do navegador nem service_role.
const ID=/^[1-9][0-9]{0,17}$/;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const SQL_GRAVAR_HASH_CHAVE = `
INSERT INTO mandato_privado.chaves_acompanhamento
 (solicitacao_id,chave_hash,emitida_por)
VALUES ($1::bigint,$2::bytea,$3::uuid)
ON CONFLICT (solicitacao_id) DO NOTHING
RETURNING solicitacao_id
`;
export function criarGravadorHashChave({executar}={}) {
 if(typeof executar!=='function')throw Error('Executor autenticado obrigatório');
 return async function gravarHash({solicitacaoId,operadorId,hash}={}) {
  if(typeof solicitacaoId!=='string'||!ID.test(solicitacaoId)
    ||typeof operadorId!=='string'||!UUID.test(operadorId)
    ||!Buffer.isBuffer(hash)||hash.length!==32)
   throw Error('Dados inválidos');
  const resultado=await executar(SQL_GRAVAR_HASH_CHAVE,[solicitacaoId,Buffer.from(hash),operadorId]);
  // Não sobrescrever uma chave já emitida: rotação requer fluxo separado.
  return resultado?.rowCount===1 && resultado.rows?.length===1;
 };
}
