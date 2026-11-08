// Persistência via RPC restrita, SEM INSERT direto pelo papel da API.
// Apenas para registros fictícios de homologação; não aceita nome de função
// informado pelo cliente. As RPCs têm IDs fixos e permissões mínimas.
const rotas=Object.freeze({
 'LEGADO-EMISSAO-TESTE-900004':{id:900004,funcao:'emitir_chave_legada_teste_900004'},
 'LEGADO-EMISSAO-TESTE-900005':{id:900005,funcao:'emitir_chave_legada_teste_900005'}
});
export function criarPersistenciaRpcFicticia({consultar}={}){
 if(typeof consultar!=='function')throw Error('Executor privado obrigatório');
 return async function persistirHash({protocolo,solicitacaoId,hash}={}){
  if(typeof protocolo!=='string'||protocolo!==protocolo.trim()||
   !Number.isSafeInteger(solicitacaoId)||!/^[a-f0-9]{64}$/.test(hash||''))
   throw Error('Dados de emissão inválidos');
  const rota=Object.hasOwn(rotas,protocolo)?rotas[protocolo]:null;
  if(!rota||rota.id!==solicitacaoId)throw Error('RPC não autorizada para este protocolo');
  const sql=`SELECT mandato_testes.${rota.funcao}($1,$2,$3) AS emitido`;
  const linhas=await consultar(sql,[protocolo,solicitacaoId,hash]);
  if(!Array.isArray(linhas)||linhas.length!==1||linhas[0]?.emitido!==true)
   throw Error('Emissão não confirmada pelo banco');
  return {gravado:true};
 };
}
