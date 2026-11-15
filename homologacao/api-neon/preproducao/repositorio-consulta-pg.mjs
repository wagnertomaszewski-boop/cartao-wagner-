// Repositório para backend privado. Não exportar diretamente para clientes.
// Exige papel PostgreSQL com privilégios mínimos em mandato_privado.
import { createHmac } from 'node:crypto';
import { verificarSegredoServidor } from './segredos-privados.mjs';

export function criarRepositorioConsulta({ pool, segredoServidor }) {
 if (!pool || typeof pool.query !== 'function') throw new Error('Pool PostgreSQL obrigatório');
 verificarSegredoServidor(segredoServidor);
 return {
  async buscarPorProtocolo(protocolo) {
   // Protocolo é único quando preenchido; não retornar nome, telefone, anexos ou resposta.
   const r = await pool.query(
    `SELECT s.id AS solicitacao_id, c.segredo_verificador, c.revogada_em
       FROM public.solicitacoes s
       JOIN mandato_privado.chaves_acompanhamento c ON c.solicitacao_id=s.id
      WHERE s.protocolo=$1 LIMIT 1`, [protocolo]);
   return r.rows[0] ?? null;
  },
  async limitarTentativas({ origem, protocolo }) {
   // Sem origem confiável do proxy/backend, negar em vez de aceitar IP fornecido pelo cliente.
   if (typeof origem !== 'string' || !origem || origem.length > 256 ||
       typeof protocolo !== 'string' || !protocolo) return false;
   const identificador = createHmac('sha256', segredoServidor)
     .update('mandato:rate:v1:').update(JSON.stringify([origem,protocolo])).digest();
   const r = await pool.query(
    'SELECT mandato_privado.registrar_tentativa_consulta($1,$2,$3) AS permitido',
    [identificador, 5, 60]);
   return r.rows[0]?.permitido === true;
  }
 };
}
