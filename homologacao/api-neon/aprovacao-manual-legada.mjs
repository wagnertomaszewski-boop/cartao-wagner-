// Homologação: autorização manual registrada no banco, nunca enviada pelo navegador.
// Este adaptador complementa (não substitui) a validação independente protocolo-ID.
export function criarValidacaoAprovacaoManual({consultar}={}){
 if(typeof consultar!=='function')throw Error('Consulta interna obrigatória');
 return async function validarAprovacao({solicitacaoId}={}){
  if(!Number.isSafeInteger(solicitacaoId)||solicitacaoId<=0)return false;
  try{
   const linhas=await consultar(
    "SELECT id FROM mandato_testes.pedidos_recuperacao WHERE solicitacao_id=$1 AND status='aprovado' AND decidido_em >= now() - interval '24 hours' AND decidido_em <= now() ORDER BY decidido_em DESC LIMIT 1",
    [solicitacaoId]
   );
   return Array.isArray(linhas)&&linhas.length===1;
  }catch{return false;}
 };
}
