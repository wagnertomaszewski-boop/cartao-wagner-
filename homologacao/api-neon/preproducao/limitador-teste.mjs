// Limitador em memória APENAS para testes locais de contrato.
// NÃO usar como proteção distribuída em produção: instâncias múltiplas precisam Redis/DB atômico.
export function criarLimitadorTeste({ limite = 5, janelaMs = 60_000, agora = () => Date.now() } = {}) {
  if (!Number.isInteger(limite) || limite < 1 || !Number.isSafeInteger(janelaMs) || janelaMs < 1) throw new Error('Configuração inválida');
  const tentativas = new Map();
  return async ({ origem, protocolo } = {}) => {
    if (typeof origem !== 'string' || !origem.trim() || typeof protocolo !== 'string' || !protocolo) return false;
    const chave = JSON.stringify([origem, protocolo]);
    const tempo = agora();
    const registro = tentativas.get(chave);
    if (!registro || tempo >= registro.inicio + janelaMs) {
      tentativas.set(chave, { inicio: tempo, quantidade: 1 });
      return true;
    }
    if (registro.quantidade >= limite) return false;
    registro.quantidade++;
    return true;
  };
}
