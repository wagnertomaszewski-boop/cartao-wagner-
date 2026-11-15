// Handler HTTP desacoplado: NÃO cria servidor nem acessa produção.
// A origem DEVE vir de um middleware de proxy confiável, jamais do JSON enviado.
import { criarConsultaProtegida } from './consulta-protegida.mjs';
import { criarRepositorioConsulta } from './repositorio-consulta-pg.mjs';
import { criarLeitorPublico } from './leitor-publico-pg.mjs';

export function criarHandlerConsulta({ pool, segredoServidor, obterOrigemConfiavel }) {
 if (typeof obterOrigemConfiavel !== 'function') throw new Error('Origem confiável obrigatória');
 const repo = criarRepositorioConsulta({ pool, segredoServidor });
 const consultar = criarConsultaProtegida({ ...repo, segredoServidor });
 const lerResumo = criarLeitorPublico({ pool });
 return async function tratar({ metodo, corpo, contexto } = {}) {
  const cabecalhos = { 'cache-control': 'no-store', 'content-type': 'application/json; charset=utf-8' };
  if (metodo !== 'POST') return { status: 405, cabecalhos, corpo: { erro: 'Método não permitido' } };
  if (!corpo || typeof corpo !== 'object' || Array.isArray(corpo)) return { status: 400, cabecalhos, corpo: { erro: 'Requisição inválida' } };
  // Não confiar em x-forwarded-for recebido diretamente do cliente.
  let origem;
  try { origem = obterOrigemConfiavel(contexto); }
  catch { return { status: 403, cabecalhos, corpo: { autorizado: false } }; }
  let resultado;
  try { resultado = await consultar({ protocolo: corpo.protocolo, chave: corpo.chave, origem }); }
  catch { return { status: 503, cabecalhos, corpo: { erro: 'Consulta temporariamente indisponível' } }; }
  if (!resultado.autorizado) return { status: 403, cabecalhos, corpo: { autorizado: false } };
  let resumo;
  try { resumo = await lerResumo(resultado.solicitacaoId); }
  catch { return { status: 503, cabecalhos, corpo: { erro: 'Consulta temporariamente indisponível' } }; }
  if (!resumo) return { status: 403, cabecalhos, corpo: { autorizado: false } };
  return { status: 200, cabecalhos, corpo: { autorizado: true, solicitacao: resumo } };
 };
}
