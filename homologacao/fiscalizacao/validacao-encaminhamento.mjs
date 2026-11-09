// Validacao pura para homologacao. Sem rede, banco ou dados pessoais.
export function validarEncaminhamento({ data, protocolo }, hoje) {
  if (typeof protocolo !== 'string' || !/^[\p{L}\p{N}][\p{L}\p{N} ._\/-]{0,79}$/u.test(protocolo) || protocolo.trim() !== protocolo || !/[\p{L}\p{N}]/u.test(protocolo)) {
    throw new TypeError('Protocolo oficial invalido');
  }
  if (typeof data !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(data)) throw new RangeError('Data invalida');
  const [ano, mes, dia] = data.split('-').map(Number);
  const d = new Date(0);
  d.setUTCHours(0,0,0,0);
  d.setUTCFullYear(ano, mes-1, dia);
  if (d.getUTCFullYear() !== ano || d.getUTCMonth() !== mes-1 || d.getUTCDate() !== dia) throw new RangeError('Data impossivel');
  if (typeof hoje !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(hoje)) throw new RangeError('Hoje invalido');
  const [a,m,dd] = hoje.split('-').map(Number);
  const atual = new Date(0);
  atual.setUTCHours(0,0,0,0);
  atual.setUTCFullYear(a,m-1,dd);
  if (atual.getUTCFullYear() !== a || atual.getUTCMonth() !== m-1 || atual.getUTCDate() !== dd) throw new RangeError('Hoje impossivel');
  if (d > atual) throw new RangeError('Encaminhamento futuro');
  return Object.freeze({ data, protocolo });
}

export function confirmarLeituraEncaminhamento(enviado, lido) {
  if (!lido || typeof lido !== 'object' || lido.data !== enviado.data || lido.protocolo !== enviado.protocolo) {
    throw new Error('Gravacao nao confirmada pela leitura');
  }
  return true;
}
