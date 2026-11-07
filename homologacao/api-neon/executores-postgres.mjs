// Executor PostgreSQL: conexão é injetada no servidor, nunca exposta ao navegador.
// Cada operação ocorre em uma transação; o papel é fixo, não fornecido pelo cliente.
const PAPEIS = Object.freeze({cidadao:'mandato_cidadao_a',admin:'mandato_admin_teste'});
export function criarExecutoresPostgres({pool} = {}) {
 if (!pool || typeof pool.connect !== 'function') throw new Error('Pool PostgreSQL obrigatório');
 async function executar(papel,sql,parametros=[]) {
  if (!Object.values(PAPEIS).includes(papel)) throw new Error('Papel inválido');
  if (typeof sql !== 'string' || !/^SELECT\s/i.test(sql) || !Array.isArray(parametros))
    throw new Error('Consulta não permitida');
  const cliente=await pool.connect();
  let iniciou=false;
  try {
   await cliente.query('BEGIN'); iniciou=true;
   await cliente.query("SET LOCAL statement_timeout = '3000ms'");
   await cliente.query('SET LOCAL ROLE '+papel);
   const resultado=await cliente.query(sql,parametros);
   await cliente.query('COMMIT'); iniciou=false;
   return resultado.rows;
  } catch(err) {
   if(iniciou) { try {await cliente.query('ROLLBACK');} catch {} }
   throw err;
  } finally {cliente.release();}
 }
 return {
  executarCidadao:(sql,parametros)=>executar(PAPEIS.cidadao,sql,parametros),
  executarAdmin:(sql,parametros)=>executar(PAPEIS.admin,sql,parametros)
 };
}
