// Executor mínimo para a RPC de homologação, usando conexão pg do servidor.
// O usuário da conexão DEVE ser mandato_api_homologacao, sem SET ROLE privilegiado.
import {SQL_RPC_CONSULTA_HOMOLOGACAO,criarConsultaRpcHomologacao} from './consulta-rpc-homologacao.mjs';
export function criarOperacaoConsultaNeonRestrita({pool}={}) {
 if(!pool||typeof pool.query!=='function')throw Error('Pool PostgreSQL obrigatório');
 const consultar=criarConsultaRpcHomologacao({executar:async(sql,parametros)=>{
  if(sql!==SQL_RPC_CONSULTA_HOMOLOGACAO)throw Error('SQL não autorizado');
  try {
   const resultado=await pool.query(sql,parametros);
   return {rows:resultado.rows};
  } catch(erro) {
   if(process.env.HABILITAR_AUTOTESTE_NEON_HOMOLOGACAO==='sim') {
    const codigo=typeof erro?.code==='string' && /^[A-Z0-9]{5}$/.test(erro.code)?erro.code:'SEM_SQLSTATE';
    console.error('AUTOTESTE_NEON_SQLSTATE='+codigo);
   }
   throw erro;
  }
 }});
 return async function operacao({dados}={}) {
  if(!dados||typeof dados!=='object'||Array.isArray(dados))throw Error('Dados inválidos');
  const resultado=await consultar({protocolo:dados.protocolo,chave:dados.chave});
  return {resultado,respostas:[],historico:[],anexos:[]};
 };
}
