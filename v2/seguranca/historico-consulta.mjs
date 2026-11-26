const estilos = {
 recebida: ['#08748b', 'A solicitação foi registrada.'],
 'em análise': ['#815700', 'A equipe está analisando o pedido.'],
 encaminhada: ['#0b69bb', 'O pedido foi encaminhado ao setor responsável.'],
 encaminhado: ['#0b69bb', 'O pedido foi encaminhado ao setor responsável.'],
 'aguardando resposta': ['#7651a1', 'A equipe aguarda resposta do setor responsável.'],
 'em andamento': ['#08685c', 'As providências estão em andamento.'],
 concluída: ['#197044', 'A solicitação foi concluída.'],
 concluído: ['#197044', 'A solicitação foi concluída.']
};
const formato = new Intl.DateTimeFormat('pt-BR', {dateStyle:'short',timeStyle:'short',timeZone:'America/Sao_Paulo'});

export function dataMovimentacao(valor) {
 if (typeof valor !== 'string' || !valor.trim()) return '';
 const data = new Date(valor);
 return Number.isFinite(data.getTime()) ? formato.format(data) : '';
}

export function renderizarHistorico(lista, historico = []) {
 const registros = historico.filter(item => typeof item?.status === 'string' && item.status.trim());
 const ultima = registros.reduce((atual, item) => {
  const data = Date.parse(item.criadoEm);
  return Number.isFinite(data) && (!atual || data >= Date.parse(atual.criadoEm)) ? item : atual;
 }, null);
 const doc = lista.ownerDocument;
 lista.replaceChildren(...registros.map(item => {
  const li = doc.createElement('li');
  li.className = item === ultima ? 'step current' : 'step';
  const estilo = Object.hasOwn(estilos, item.status.trim().toLowerCase()) ? estilos[item.status.trim().toLowerCase()] : null;
  const dot = doc.createElement('span');
  dot.className = 'dot';
  dot.setAttribute('aria-hidden','true');
  if (estilo) li.style.setProperty('--marcador',estilo[0]);
  const titulo = doc.createElement('b');
  titulo.textContent = item.status;
  li.append(dot,titulo);
  if (estilo) {
   const descricao = doc.createElement('span');
   descricao.textContent = estilo[1];
   li.append(descricao);
  }
  const data = dataMovimentacao(item.criadoEm);
  if (data) {
   const quando = doc.createElement('time');
   quando.className = 'quando';
   quando.dateTime = item.criadoEm;
   quando.textContent = item === ultima ? data + ' · Mais recente' : data;
   li.append(quando);
  }
  return li;
 }));
 return registros.length;
}
