// Adaptador transacional para Neon isolado. Não habilitar em rotas públicas.
// A tabela de chaves usa PK(solicitacao_id): rotação é UPDATE, não INSERT duplicado.
const TABELA='mandato_chaves_homologacao.chaves_acompanhamento';
export function criarTransacaoChavesNeon({pool}={}) {
 if(!pool||typeof pool.connect!=='function')throw Error('Pool PostgreSQL obrigatório');
 return async function transacionar(trabalho) {
  if(typeof trabalho!=='function')throw Error('Trabalho transacional obrigatório');
  const client=await pool.connect();
  let iniciou=false;
  try {
   await client.query('BEGIN');
   iniciou=true;
   const bloqueados=new Set();
   const tx={
    async revogarAtiva({solicitacaoId}) {
     const id=String(solicitacaoId);
     // Serializa rotações inclusive quando ainda não existe chave.
     const solicitacao=await client.query('SELECT id FROM mandato_chaves_homologacao.solicitacoes WHERE id=$1::bigint FOR UPDATE',[id]);
     if(solicitacao.rowCount!==1)throw Error('Solicitação não encontrada');
     bloqueados.add(id);
     const r=await client.query('UPDATE '+TABELA+' SET revogada_em=now() WHERE solicitacao_id=$1::bigint AND revogada_em IS NULL',[id]);
     return r.rowCount;
    },
    async inserirHash({solicitacaoId,hash,operadorId}) {
     const id=String(solicitacaoId);
     if(!bloqueados.has(id)||!Buffer.isBuffer(hash)||hash.length!==32)throw Error('Pré-condições da rotação inválidas');
     const r=await client.query('INSERT INTO '+TABELA+' (solicitacao_id,chave_hash,emitida_por,emitida_em,revogada_em) VALUES ($1::bigint,$2::bytea,$3::uuid,now(),NULL) ON CONFLICT (solicitacao_id) DO UPDATE SET chave_hash=EXCLUDED.chave_hash,emitida_por=EXCLUDED.emitida_por,emitida_em=EXCLUDED.emitida_em,revogada_em=NULL',[id,hash,operadorId]);
     if(r.rowCount!==1)throw Error('Emissão não persistida');
    },
    // O auditor recebe apenas a conexão transacional, sem dados de chave em texto claro.
    async queryAuditoria(sql,parametros) {
     if(typeof sql!=='string'||!/^INSERT INTO mandato_chaves_homologacao\.auditoria_chaves\s*\(/i.test(sql))throw Error('SQL de auditoria não autorizado');
     return client.query(sql,parametros);
    }
   };
   const resultado=await trabalho(tx);
   await client.query('COMMIT');
   iniciou=false;
   return resultado;
  } catch(erro) {
   if(iniciou)try{await client.query('ROLLBACK');}catch{}
   throw erro;
  } finally {client.release();}
 };
}
