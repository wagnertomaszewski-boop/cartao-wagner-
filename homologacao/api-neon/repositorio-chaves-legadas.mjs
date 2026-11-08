// Adaptador de armazenamento de HOMOLOGAÇÃO para chaves legadas.
// Usa transação e bloqueio por protocolo; não contém credenciais nem conecta produção.
export function criarRepositorioChavesLegadas({transacionar}={}){
 if(typeof transacionar!=='function')throw Error('Transação obrigatória');
 return {
  async persistirHash({protocolo,hash,solicitacaoId}={}){
   if(typeof protocolo!=='string'||!protocolo.trim()||protocolo.length>40||!/^[a-f0-9]{64}$/.test(hash||'')||!Number.isSafeInteger(solicitacaoId)||solicitacaoId<=0)
    throw Error('Dados inválidos');
   const protocoloNormalizado=protocolo.trim();
   return transacionar(async executar=>{
    if(typeof executar!=='function')throw Error('Executor transacional obrigatório');
    // Chave de bloqueio estável no escopo da transação.
    await executar('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))',[protocoloNormalizado]);
    // A tabela de homologação deve ter UNIQUE(protocolo) para reforçar a unicidade.
    const existente=await executar('SELECT 1 FROM mandato_testes.chaves_legadas WHERE protocolo=$1 LIMIT 1',[protocoloNormalizado]);
    if(existente.length)throw Error('Protocolo já possui chave; recuperação manual necessária');
    // A consulta_segura já lê acessos_protocolo: vincular as duas tabelas
    // na MESMA transação, sem expor a chave ou alterar registros existentes.
    const acesso=await executar('SELECT solicitacao_id FROM mandato_testes.acessos_protocolo WHERE protocolo=$1 LIMIT 1',[protocoloNormalizado]);
    if(acesso.length)throw Error('Protocolo já possui acesso; recuperação manual necessária');
    // A chave primária de acessos_protocolo é solicitacao_id: evitar segunda chave para o mesmo ID.
    const acessoDaSolicitacao=await executar('SELECT protocolo FROM mandato_testes.acessos_protocolo WHERE solicitacao_id=$1 LIMIT 1',[solicitacaoId]);
    if(acessoDaSolicitacao.length)throw Error('Solicitação já possui acesso; recuperação manual necessária');
    const solicitacao=await executar('SELECT id FROM mandato_testes.solicitacoes WHERE id=$1 LIMIT 1',[solicitacaoId]);
    if(!solicitacao.length)throw Error('Solicitação legada não encontrada na homologação');
    await executar('INSERT INTO mandato_testes.chaves_legadas (protocolo, hash_chave) VALUES ($1,$2)',[protocoloNormalizado,hash]);
    await executar('INSERT INTO mandato_testes.acessos_protocolo (solicitacao_id, protocolo, segredo_hash) VALUES ($1,$2,$3)',[solicitacao[0].id,protocoloNormalizado,hash]);
    await executar('INSERT INTO mandato_testes.auditoria_chaves_legadas (protocolo, solicitacao_id, evento) VALUES ($1,$2,$3)',[protocoloNormalizado,solicitacaoId,'chave_legada_emitida']);
    return {gravado:true};
   });
  }
 };
}
