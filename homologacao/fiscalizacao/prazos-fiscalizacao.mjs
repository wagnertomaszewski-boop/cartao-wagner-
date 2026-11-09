// Utilitario puro para homologacao; nao acessa banco, rede ou dados de cidadaos.
export function diasDesdeEncaminhamento(dataISO, hojeISO) {
  function parse(data) {
    if (typeof data !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(data)) throw new RangeError('Data deve estar em AAAA-MM-DD');
    const [ano, mes, dia] = data.split('-').map(Number);
    const utc = Date.UTC(ano, mes - 1, dia);
    const d = new Date(utc);
    if (d.getUTCFullYear() !== ano || d.getUTCMonth() !== mes - 1 || d.getUTCDate() !== dia) throw new RangeError('Data invalida');
    return utc;
  }
  const inicio = parse(dataISO), hoje = parse(hojeISO);
  if (inicio > hoje) throw new RangeError('Encaminhamento futuro');
  return (hoje - inicio) / 86400000;
}
export function faixaAlerta(dias, concluida = false) {
  if (!Number.isInteger(dias) || dias < 0) throw new RangeError('Dias invalidos');
  if (typeof concluida !== 'boolean') throw new TypeError('Concluida deve ser booleano');
  if (concluida || dias < 30) return null;
  return dias >= 180 ? 180 : dias >= 90 ? 90 : dias >= 60 ? 60 : 30;
}
