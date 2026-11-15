// Contrato de autorização para a futura API de produção.
// Sem conexão de banco: fail-closed até implementação do repositório privado.
import { conferirVerificador } from './segredos-privados.mjs';

const protocoloValido = v => typeof v === 'string' && v.length >= 3 && v.length <= 80 && !/[\x00-\x1f\x7f]/.test(v);
const chaveValida = v => typeof v === 'string' && /^[A-Za-z0-9_-]{43}$/.test(v);

export function criarConsultaProtegida({ buscarPorProtocolo, segredoServidor, limitarTentativas }) {
  if (typeof buscarPorProtocolo !== 'function' || typeof limitarTentativas !== 'function') throw new Error('Dependências obrigatórias');
  // Valida configuração na inicialização, não após receber requisições.
  if (typeof segredoServidor !== 'string' || Buffer.byteLength(segredoServidor, 'utf8') < 32) throw new Error('Segredo de servidor inválido');
  return async function consultar({ protocolo, chave, origem } = {}) {
    const negado = { autorizado: false };
    if (!protocoloValido(protocolo) || !chaveValida(chave)) return negado;
    // O limitador deve falhar fechado em caso de erro, indisponibilidade ou excesso.
    let permitido = false;
    try { permitido = await limitarTentativas({ origem, protocolo }); }
    catch { return negado; }
    if (permitido !== true) return negado;
    const registro = await buscarPorProtocolo(protocolo);
    if (!registro || registro.revogada_em || !registro.segredo_verificador) return negado;
    const verificador = Buffer.isBuffer(registro.segredo_verificador)
      ? registro.segredo_verificador
      : typeof registro.segredo_verificador === 'string' && /^\\x[0-9a-f]{64}$/i.test(registro.segredo_verificador)
        ? Buffer.from(registro.segredo_verificador.slice(2), 'hex') : null;
    if (!conferirVerificador('key', chave, verificador, segredoServidor)) return negado;
    // Retorna só ID interno: os dados públicos serão montados por outra camada autorizada.
    return { autorizado: true, solicitacaoId: registro.solicitacao_id };
  };
}
