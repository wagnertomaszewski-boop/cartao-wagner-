// Adaptador exclusivo da RPC sintética de homologação Neon.
// Não consulta tabelas diretamente; o papel de API tem apenas EXECUTE na RPC.
import {hashChavePrivada} from './chaves-privadas.mjs';
const PROTOCOLO=/^[A-Za-z0-9-]{1,40}$/;
export const SQL_RPC_CONSULTA_HOMOLOGACAO =
 'SELECT assunto,status FROM mandato_chaves_homologacao.consultar_chave($1::text,$2::bytea)';
export function criarConsultaRpcHomologacao({executar}={}) {
 if(typeof executar!=='function')throw Error('Executor autenticado obrigatório');
 return async function consultar({protocolo,chave}={}) {
  if(typeof protocolo!=='string'||!PROTOCOLO.test(protocolo))
   throw Error('Dados inválidos');
  const hash=hashChavePrivada(chave);
  if(!hash)throw Error('Dados inválidos');
  const resultado=await executar(SQL_RPC_CONSULTA_HOMOLOGACAO,[protocolo,hash]);
  if(!Array.isArray(resultado?.rows)||resultado.rows.length>1)
   throw Error('Resposta de banco inválida');
  return resultado.rows.map(({assunto,status})=>({assunto,status}));
 };
}
