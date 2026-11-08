// Auditoria somente leitura da política de aprovação em funções de emissão.
// Não modifica o banco. Retorna divergências para impedir declaração prematura
// de prontidão da emissão. Não executa nem expõe as funções SECURITY DEFINER.
export async function auditarPoliticaEmissao({consultar}={}){
 if(typeof consultar!=='function')throw Error('Consulta privada obrigatória');
 const nomes=['emitir_chave_legada_teste_900004','emitir_chave_legada_teste_900005'];
 const resultado=[];
 for(const nome of nomes){
  let politica='indisponivel';
  try{
   const linhas=await consultar(
    `SELECT pg_get_functiondef(p.oid) AS definicao
       FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
      WHERE n.nspname='mandato_testes' AND p.proname=$1
        AND pg_get_function_identity_arguments(p.oid)='p_protocolo text, p_solicitacao_id bigint, p_hash text'`,
    [nome]);
   if(Array.isArray(linhas)&&linhas.length===1){
    const definicao=linhas[0]?.definicao;
    politica=typeof definicao==='string' &&
     /decidido_em\s*>=\s*now\(\)\s*-\s*interval\s*'24 hours'/i.test(definicao) &&
     /decidido_em\s*<=\s*now\(\)/i.test(definicao)
     ? 'atualizada':'desatualizada';
   }
  }catch{politica='indisponivel';}
  resultado.push({funcao:nome,politica});
 }
 return {pronto:resultado.every(x=>x.politica==='atualizada'),resultado};
}
