// Leitura da fonte PRIVADA de atestados externos da candidata, ainda não ativada.
// A role da API não tem INSERT/UPDATE: um conferente separado deve provisionar
// provas assinadas após verificar a posse do novo número por canal independente.
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function criarFonteAtestadoContato({pool}={}){
 if(typeof pool?.query!=='function')throw Error('Conexão privada de leitura obrigatória');
 return async function buscarAtestado({pedidoId,solicitacaoId}={},executorConsulta=null){
  if(!UUID.test(pedidoId||'')||!/^[1-9]\d{0,15}$/.test(String(solicitacaoId)))return null;
  // Apenas SELECT parametrizado; sem confiar em payload, cabeçalho ou checkbox do cliente.
  // Ausência da tabela, privilégio ou fonte: o verificador retorna NEGADO.
  // Se já existe transação ativa, não tentar uma nova conexão do pool max=1.
  if(executorConsulta!==null&&typeof executorConsulta?.query!=='function')return null;
  const r=await (executorConsulta||pool).query(
   'SELECT payload,assinatura FROM mandato_privado.atestados_regularizacao WHERE pedido_id=$1::uuid AND solicitacao_id=$2::bigint AND revogado_em IS NULL ORDER BY recebido_em DESC LIMIT 1',
   [pedidoId,String(solicitacaoId)]
  );
  return r.rows?.[0]??null;
 };
}
