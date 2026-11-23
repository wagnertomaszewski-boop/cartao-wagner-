// Adaptador PostgreSQL para um serviço EXTERNO de verificação, não para a API.
// Não conecta sozinho a banco nenhum. A migração experimental não é executada.
// Confirmação única por UPDATE atômico; no máximo 5 erros dentro de 5 minutos.
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TABELA='verificador_posse_hml.desafios';

function okUuid(x){return typeof x==='string'&&UUID.test(x);}
function hash32(x){return Buffer.isBuffer(x)&&x.length===32;}
function dataValida(s){
 return typeof s==='string'&&Number.isFinite(Date.parse(s))&&
 new Date(s).toISOString()===s;
}
function validarCriacao(d){
 const c=d?.contexto;
 return d&&okUuid(d.desafioId)&&okUuid(d.evidenciaId)&&c&&
 okUuid(c.pedidoId)&&okUuid(c.operadorId)&&
 /^[1-9]\d{0,15}$/.test(String(c.solicitacaoId))&&
 /^\+55[1-9]\d{9,10}$/.test(c.telefoneOriginal||'')&&
 /^\+55[1-9]\d{10}$/.test(c.telefoneNovo||'')&&
 hash32(d.codigoVerificador)&&hash32(d.telefoneHash)&&
 dataValida(d.criadoEm)&&dataValida(d.expiraEm)&&
 Date.parse(d.expiraEm)-Date.parse(d.criadoEm)===300000;
}

/** A conexão deve ser de uma ROLE exclusiva do verificador independente. */
export function criarPersistenciaPossePostgres({pool}={}){
 if(typeof pool?.connect!=='function'||typeof pool?.query!=='function')
  throw Error('Pool privado externo obrigatório');
 return Object.freeze({
  async criar(d){
   if(!validarCriacao(d))return false;
   // Advisory lock por destino evita duas transações simultâneas passarem na cota.
   const chave=d.telefoneHash.readBigInt64BE(0).toString();
   const c=await pool.connect();
   try{
    await c.query('BEGIN');
    await c.query('SELECT pg_advisory_xact_lock($1::bigint)',[chave]);
    const valores=[
     d.desafioId,d.contexto.pedidoId,String(d.contexto.solicitacaoId),
     d.contexto.operadorId,d.contexto.telefoneOriginal,d.contexto.telefoneNovo,
     d.telefoneHash,d.codigoVerificador,d.evidenciaId,d.criadoEm,d.expiraEm
    ];
    const sql=[
     'INSERT INTO '+TABELA,
     '(desafio_id,pedido_id,solicitacao_id,operador_id,telefone_original,telefone_novo,',
     'telefone_hash,codigo_verificador,evidencia_id,criado_em,expira_em)',
     'SELECT $1::uuid,$2::uuid,$3::bigint,$4::uuid,$5,$6,',
     '$7::bytea,$8::bytea,$9::uuid,$10::timestamptz,$11::timestamptz',
     'WHERE (SELECT count(*) FROM '+TABELA,
     "WHERE telefone_hash=$7::bytea AND criado_em>$10::timestamptz-interval '1 hour')<3",
     'ON CONFLICT (pedido_id) DO NOTHING RETURNING desafio_id'
    ].join(' ');
    const r=await c.query(sql,valores);
    await c.query('COMMIT');
    return r.rows.length===1;
   }catch(e){
    await c.query('ROLLBACK');
    throw e;
   }finally{c.release();}
  },
  async verificar({desafioId,codigoVerificador,confirmadoEm}={}){
   if(!okUuid(desafioId)||!hash32(codigoVerificador)||!dataValida(confirmadoEm))
    return null;
   const sql=[
    'UPDATE '+TABELA,
    'SET tentativas=tentativas+1,',
    'confirmado_em=CASE WHEN codigo_verificador=$2::bytea',
    'THEN $3::timestamptz ELSE NULL END',
    'WHERE desafio_id=$1::uuid',
    'AND confirmado_em IS NULL AND revogado_em IS NULL',
    'AND criado_em<=$3::timestamptz AND expira_em>$3::timestamptz',
    'AND tentativas<5',
    'RETURNING (codigo_verificador=$2::bytea) AS correto,',
    'evidencia_id,pedido_id,solicitacao_id,operador_id,telefone_original,telefone_novo'
   ].join(' ');
   const r=await pool.query(sql,[desafioId,codigoVerificador,confirmadoEm]);
   const x=r.rows[0];
   if(x?.correto!==true)return null;
   return Object.freeze({evidenciaId:x.evidencia_id,contexto:{
    pedidoId:x.pedido_id,solicitacaoId:String(x.solicitacao_id),
    operadorId:x.operador_id,telefoneOriginal:x.telefone_original,
    telefoneNovo:x.telefone_novo
   }});
  },
  async revogar({desafioId}={}){
   if(!okUuid(desafioId))return;
   const sql='UPDATE '+TABELA+
    ' SET revogado_em=now() WHERE desafio_id=$1::uuid'+
    ' AND confirmado_em IS NULL AND revogado_em IS NULL';
   await pool.query(sql,[desafioId]);
  }
 });
}
