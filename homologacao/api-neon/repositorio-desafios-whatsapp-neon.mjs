// Persistência de OTP no Neon com RPC SECURITY DEFINER.
// Conta deve ter somente EXECUTE nas funções e nenhum acesso direto à tabela.
export function criarRepositorioDesafiosWhatsappNeon({pool}={}){
 if(typeof pool?.query!=='function')throw Error('Pool Neon obrigatório');
 return Object.freeze({
  confirmarAtomico:async({id,solicitacaoId,acao,hash})=>{
   const r=await pool.query('SELECT mandato_chaves_homologacao.confirmar_e_registrar_whatsapp($1,$2::bigint,$3,$4) AS ok',[id,solicitacaoId,acao,hash]);
   return r.rows?.[0]?.ok===true;
  },
  armazenarDesafio:async({id,solicitacaoId,acao,hash,expiraEm})=>{
   const r=await pool.query('SELECT mandato_chaves_homologacao.registrar_desafio_whatsapp($1,$2::bigint,$3,$4,to_timestamp($5::double precision/1000.0)) AS ok',[id,solicitacaoId,acao,hash,expiraEm]);
   if(r.rows?.[0]?.ok!==true)throw Error('Desafio não registrado');
  },
  obterDesafio:async({id})=>{
   const r=await pool.query('SELECT * FROM mandato_chaves_homologacao.tentar_desafio_whatsapp($1)',[id]);
   if(r.rowCount!==1)return null;
   const d=r.rows[0];
   return {solicitacaoId:String(d.solicitacao_id),acao:d.acao,hash:d.hash,expiraEm:new Date(d.expira_em).getTime()};
  },
  consumirDesafio:async({id,invalidar=false})=>{
   // Falha de envio também deve invalidar o desafio, mesmo sem tentativa.
   const funcao=invalidar?'invalidar_desafio_whatsapp':'consumir_desafio_whatsapp';
   const r=await pool.query('SELECT mandato_chaves_homologacao.'+funcao+'($1) AS ok',[id]);
   return r.rows?.[0]?.ok===true;
  }
 });
}
