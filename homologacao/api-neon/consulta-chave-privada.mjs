// Consulta segura isolada para homologação. Exige papel de backend com RLS
// revisada. O hash nunca é aceito diretamente do cliente.
import {hashChavePrivada} from './chaves-privadas.mjs';
const PROTOCOLO=/^[A-Za-z0-9-]{1,40}$/;
export const SQL_CONSULTAR_CHAVE = `
SELECT s.assunto,s.status
FROM public.solicitacoes AS s
JOIN mandato_privado.chaves_acompanhamento AS c
  ON c.solicitacao_id = s.id
WHERE s.protocolo = $1::text
  AND c.revogada_em IS NULL
  AND c.chave_hash = $2::bytea
LIMIT 1
`;
export function criarConsultaComChave({executar}={}) {
 if(typeof executar!=='function')throw Error('Executor de backend obrigatório');
 return async function consultar({protocolo,chave}={}) {
  if(typeof protocolo!=='string'||!PROTOCOLO.test(protocolo))
   throw Error('Dados inválidos');
  const hash=hashChavePrivada(chave);
  if(!hash)throw Error('Dados inválidos');
  const resultado=await executar(SQL_CONSULTAR_CHAVE,[protocolo,hash]);
  if(!Array.isArray(resultado?.rows)||resultado.rows.length>1)
   throw Error('Resposta de banco inválida');
  return resultado.rows.map(({assunto,status})=>({assunto,status}));
 };
}
