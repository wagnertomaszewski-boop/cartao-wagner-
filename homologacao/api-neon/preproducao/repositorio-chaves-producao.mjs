// Adaptador transacional para o cadastro definitivo (ainda não ativado).
// Uso exclusivo por backend autenticado, com pool PostgreSQL privado.
// A chave é gerada pelo backend, entregue uma única vez ao cidadão e nunca ao Painel.
import { randomBytes, createHmac } from 'node:crypto';

export function criarRepositorioChavesProducao({pool, segredoServidor}) {
 if (!pool?.connect || typeof segredoServidor !== 'string' || Buffer.byteLength(segredoServidor)<32)
  throw new Error('Configuração privada insuficiente');
 const verificar = chave => createHmac('sha256',segredoServidor).update('key:').update(chave).digest();
 return {
  async vincularChave({solicitacaoId, protocolo}) {
   if (!Number.isSafeInteger(solicitacaoId)||solicitacaoId<=0||typeof protocolo!=='string'||!protocolo.trim())
    throw new Error('Solicitação inválida');
   const chave=randomBytes(32).toString('base64url');
   const cliente=await pool.connect();
   try {
    await cliente.query('BEGIN');
    const {rows}=await cliente.query(
      'SELECT id FROM public.solicitacoes WHERE id=$1 AND protocolo=$2 FOR UPDATE',
      [solicitacaoId,protocolo.trim()]);
    if(rows.length!==1) throw new Error('Solicitação não encontrada');
    const resultado=await cliente.query(
      'INSERT INTO mandato_privado.chaves_acompanhamento(solicitacao_id,segredo_verificador) VALUES($1,$2) ON CONFLICT DO NOTHING RETURNING solicitacao_id',
      [solicitacaoId,verificar(chave)]);
    if(resultado.rowCount!==1) throw new Error('Chave já vinculada');
    await cliente.query('COMMIT');
    return {protocolo:protocolo.trim(),chave};
   } catch(e) {
    await cliente.query('ROLLBACK');
    throw e;
   } finally { cliente.release(); }
  }
 };
}
