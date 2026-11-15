// Leitura mínima após autorização protocolo + chave.
// NÃO retorna nomes, WhatsApp, coordenadas, notas internas ou anexos.
export function criarLeitorPublico({ pool }) {
 if (!pool || typeof pool.query !== 'function') throw new Error('Pool PostgreSQL obrigatório');
 return async function lerResumo(solicitacaoId) {
  if (!Number.isSafeInteger(Number(solicitacaoId)) || Number(solicitacaoId) < 1) throw new Error('Identificador inválido');
  const r = await pool.query(
   `SELECT s.status, s.assunto, s.criado_em, s.atualizado_em
      FROM public.solicitacoes s WHERE s.id=$1 LIMIT 1`, [solicitacaoId]);
  if (!r.rows[0]) return null;
  const s = r.rows[0];
  const h = await pool.query(
   `SELECT status, criado_em FROM public.solicitacoes_status_historico
      WHERE solicitacao_id=$1 ORDER BY criado_em ASC, id ASC LIMIT 100`, [solicitacaoId]);
  return {
   status: s.status ?? null, assunto: s.assunto ?? null,
   criadoEm: s.criado_em ?? null, atualizadoEm: s.atualizado_em ?? null,
   historico: h.rows.map(x => ({ status: x.status ?? null, criadoEm: x.criado_em ?? null }))
  };
 };
}
