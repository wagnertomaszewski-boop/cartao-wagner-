// Cliente público do Mandato em Ação (TWA/site).
// Nunca inclui credencial administrativa, service_role, RPC pública ou segredo em URL.
const PROJETO = 'pmmsdjozyyxkbuqlkfpb';
const CHAVE = /^[A-Za-z0-9_-]{43}$/;
const RECIBO = /^[A-Za-z0-9_-]{43}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ENDPOINTS = Object.freeze({
  consultar: 'solicitacoes/consultar',
  solicitar: 'recuperacao/solicitar',
  validar: 'recuperacao/validar',
  baixar: 'arquivos/baixar'
});
const erro = (mensagem) => new Error(mensagem);

export function validarProtocolo(protocolo) {
  if (typeof protocolo !== 'string') throw erro('Informe um protocolo válido.');
  const p = protocolo.trim();
  if (!p || p.length > 80 || /[\x00-\x1f\x7f]/.test(p)) throw erro('Informe um protocolo válido.');
  return p;
}

export function normalizarTelefoneRecuperacao(valor) {
  const v = String(valor ?? '').trim();
  if (v.startsWith('+') && !v.startsWith('+55')) throw erro('Informe um WhatsApp brasileiro com DDD.');
  const d = v.replace(/\D/g, '');
  const telefone = d.length === 10 || d.length === 11 ? '55' + d : d;
  // DDD + 8 dígitos é legado; não acrescentar o nono dígito automaticamente.
  if (!/^55[1-9]\d{9,10}$/.test(telefone)) throw erro('Informe o telefone cadastrado com DDD.');
  return '+' + telefone;
}

export function validarConfiguracaoConsulta(config) {
  if (!config || config.ativo !== true || config.ambiente !== 'producao' || config.projeto !== PROJETO) {
    throw erro('Acompanhamento em manutenção. Seus pedidos continuam registrados.');
  }
  if (typeof config.apiBase !== 'string' || !config.apiBase ||
      Object.keys(config).some(k => !['ativo', 'ambiente', 'projeto', 'apiBase', 'versao'].includes(k))) {
    throw erro('Configuração do acompanhamento indisponível.');
  }
  let url;
  try { url = new URL(config.apiBase); } catch { throw erro('Configuração do acompanhamento indisponível.'); }
  const render = url.origin === 'https://mandato-api-producao.onrender.com' && url.pathname === '/';
  const edge = url.origin === 'https://' + PROJETO + '.supabase.co' &&
               url.pathname === '/functions/v1/mandato-privado';
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || (!render && !edge)) {
    throw erro('API de produção não aprovada.');
  }
  return url.origin + url.pathname.replace(/\/$/, '');
}

export function criarClienteConsulta(config, buscar = fetch) {
  const base = validarConfiguracaoConsulta(config);
  if (typeof buscar !== 'function') throw erro('Serviço de rede indisponível.');
  async function enviar(acao, dados) {
    if (!Object.hasOwn(ENDPOINTS, acao)) throw erro('Operação não permitida.');
    let resposta;
    try {
      resposta = await buscar(base + '/api/v1/' + ENDPOINTS[acao], {
        method: 'POST', credentials: 'omit', cache: 'no-store',
        redirect: 'error', referrerPolicy: 'no-referrer',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(dados),
        signal: typeof AbortSignal !== 'undefined' && AbortSignal.timeout ? AbortSignal.timeout(20000) : undefined
      });
    } catch { throw erro('Não foi possível conectar. Tente novamente.'); }
    if (resposta.status === 429) throw erro('Limite de tentativas atingido. Aguarde antes de tentar novamente.');
    if (!resposta.ok) throw erro('Não foi possível concluir. Confira os dados ou tente novamente.');
    try {
      const json = await resposta.json();
      if (!json || typeof json !== 'object' || Array.isArray(json)) throw Error();
      return json;
    } catch { throw erro('Resposta indisponível. Tente novamente.'); }
  }
  function acesso(d) {
    const protocolo = validarProtocolo(d?.protocolo);
    if (typeof d?.chave !== 'string' || !CHAVE.test(d.chave)) throw erro('Informe a chave individual de acompanhamento.');
    return {protocolo, chave: d.chave};
  }
  return Object.freeze({
    async consultar(d) {
      const r = await enviar('consultar', acesso(d));
      return r.encontrado === true ? r : {encontrado: false};
    },
    solicitar(d) {
      return enviar('solicitar', {
        protocolo: validarProtocolo(d?.protocolo),
        telefone: normalizarTelefoneRecuperacao(d?.telefone)
      });
    },
    async validar(d) {
      if (!UUID.test(String(d?.pedidoId || '')) || !RECIBO.test(String(d?.recibo || '')) ||
          !/^\d{6}$/.test(String(d?.codigo || ''))) throw erro('Informe o código de seis dígitos recebido.');
      const r = await enviar('validar', {pedidoId: d.pedidoId, recibo: d.recibo, codigo: d.codigo});
      if (r.validado !== true) return {validado: false};
      if (!CHAVE.test(r.novaChave || '')) throw erro('Não foi possível confirmar a chave individual.');
      return {validado: true, protocolo: validarProtocolo(r.protocolo), novaChave: r.novaChave};
    },
    baixar(d) {
      if (!UUID.test(String(d?.arquivoId || ''))) throw erro('Arquivo privado inválido.');
      return enviar('baixar', {...acesso(d), arquivoId: d.arquivoId});
    }
  });
}
