// Adaptador de transação PostgreSQL para homologação. O pool deve ser
// fornecido pelo servidor autenticado, nunca pelo navegador.
export function criarTransacionarPostgres(pool){
 if(!pool || typeof pool.connect!=='function')throw Error('Pool PostgreSQL obrigatório');
 return async function transacionar(operacao){
  if(typeof operacao!=='function')throw Error('Operação transacional obrigatória');
  const client=await pool.connect();
  let iniciada=false;
  try{
   await client.query('BEGIN');
   iniciada=true;
   const resultado=await operacao(async(sql,parametros)=>{
    if(typeof sql!=='string'||!Array.isArray(parametros))throw Error('Consulta inválida');
    const resposta=await client.query(sql,parametros);
    return resposta.rows;
   });
   await client.query('COMMIT');
   return resultado;
  }catch(erro){
   if(iniciada)await client.query('ROLLBACK').catch(()=>{});
   throw erro;
  }finally{client.release();}
 };
}
