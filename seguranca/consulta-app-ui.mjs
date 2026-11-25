import {criarClienteConsulta} from './consulta-app-cliente.mjs';

const $ = id => document.getElementById(id);
let cliente = null;
let acesso = null;
let pedido = null;
let ocupado = false;
const limpar = () => {
  acesso = null; pedido = null;
  for (const id of ['chave', 'telefone', 'codigo', 'novaChave']) if ($(id)) $(id).value = '';
  $('resultado').hidden = true;
  $('novaChaveArea').hidden = true;
  $('codigoArea').hidden = true;
};
addEventListener('pagehide', limpar);
function informar(mensagem, erro = false) {
  const el = $('aviso');
  el.textContent = mensagem;
  el.className = erro ? 'alerta erro' : 'alerta';
  el.hidden = false;
}
function texto(id, valor) { $(id).textContent = String(valor ?? 'Não informado'); }
function formatarData(valor) {
  if (!valor) return '';
  const d = new Date(valor);
  return Number.isFinite(d.getTime()) ? d.toLocaleString('pt-BR', {timeZone: 'America/Sao_Paulo'}) : '';
}
function itens(elemento, dados, montar) {
  elemento.replaceChildren();
  for (const item of Array.isArray(dados) ? dados.slice(0, 200) : []) elemento.append(montar(item));
}
function linha(textoLinha) {
  const el = document.createElement('li');
  el.textContent = textoLinha;
  return el;
}
function exibirResultado(r) {
  texto('rProtocolo', r.protocolo);
  texto('rStatus', r.status);
  texto('rAssunto', r.assunto);
  texto('rDescricao', r.descricao);
  texto('rLocalidade', r.localidade);
  itens($('historico'), r.historico, h => linha((h.status || 'Atualização') + (formatarData(h.criadoEm || h.criado_em) ? ' — ' + formatarData(h.criadoEm || h.criado_em) : '')));
  itens($('respostas'), r.respostas, item => linha((item.mensagem || 'Resposta registrada') + (formatarData(item.criadoEm || item.criado_em) ? ' — ' + formatarData(item.criadoEm || item.criado_em) : '')));
  itens($('anexos'), r.anexos, arquivo => {
    const li = document.createElement('li');
    const botao = document.createElement('button');
    botao.type = 'button'; botao.className = 'link-arquivo';
    botao.textContent = 'Baixar ' + String(arquivo?.nome || 'documento privado').slice(0, 120);
    botao.addEventListener('click', () => void executar(async () => {
      if (!acesso) throw Error('Consulte novamente com protocolo e chave.');
      const a = await cliente.baixar({...acesso, arquivoId: arquivo.id});
      const mime = String(a.mime || '');
      if (!['image/jpeg', 'image/png', 'application/pdf', 'text/plain', 'text/csv'].includes(mime) ||
          typeof a.base64 !== 'string' || a.base64.length > 8000000 || !/^[A-Za-z0-9+/]*={0,2}$/.test(a.base64)) {
        throw Error('Documento indisponível.');
      }
      const bytes = Uint8Array.from(atob(a.base64), x => x.charCodeAt(0));
      const blobUrl = URL.createObjectURL(new Blob([bytes], {type: mime}));
      try {
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = String(a.nome || 'documento').replace(/[/\\<>:"|?*\x00-\x1f]/g, '_').slice(0, 120);
        link.click();
      } finally { setTimeout(() => URL.revokeObjectURL(blobUrl), 1500); }
    }));
    li.append(botao);
    return li;
  });
  $('resultado').hidden = false;
}
async function executar(fn) {
  if (ocupado || !cliente) return;
  ocupado = true;
  document.querySelectorAll('button').forEach(b => { if (b.dataset.acao) b.disabled = true; });
  try { await fn(); }
  catch(e) { informar(e?.message || 'Não foi possível concluir.', true); }
  finally {
    ocupado = false;
    document.querySelectorAll('button').forEach(b => { if (b.dataset.acao) b.disabled = false; });
  }
}
$('consulta').addEventListener('submit', ev => {
  ev.preventDefault();
  void executar(async () => {
    $('resultado').hidden = true;
    acesso = null;
    const dados = {protocolo: $('protocolo').value.trim(), chave: $('chave').value};
    $('chave').value = '';
    const r = await cliente.consultar(dados);
    if (!r.encontrado) throw Error('Protocolo ou chave inválidos.');
    acesso = dados;
    exibirResultado(r);
    informar('Acompanhamento aberto com sua chave individual.');
  });
});
$('abrirPrimeiroAcesso').addEventListener('click', () => {
  $('primeiroAcesso').hidden = !$('primeiroAcesso').hidden;
  $('protocoloRecuperacao').value = $('protocolo').value;
});
$('solicitar').addEventListener('submit', ev => {
  ev.preventDefault();
  void executar(async () => {
    const r = await cliente.solicitar({protocolo: $('protocoloRecuperacao').value, telefone: $('telefone').value});
    $('telefone').value = '';
    if (!r.pedidoId || !r.recibo) throw Error('Não foi possível registrar o pedido. Tente novamente.');
    pedido = {pedidoId: r.pedidoId, recibo: r.recibo};
    $('codigoArea').hidden = false;
    informar('Se os dados corresponderem ao cadastro, a equipe analisará seu pedido. Mantenha esta página aberta para informar o código enviado manualmente pelo WhatsApp.');
  });
});
$('validar').addEventListener('submit', ev => {
  ev.preventDefault();
  void executar(async () => {
    if (!pedido) throw Error('Solicite a recuperação primeiro.');
    const codigo = $('codigo').value;
    $('codigo').value = '';
    const r = await cliente.validar({...pedido, codigo});
    if (!r.validado) throw Error('Código inválido, expirado ou já utilizado.');
    pedido = null;
    $('codigoArea').hidden = true;
    $('novaChave').value = r.novaChave;
    $('novaChaveArea').hidden = false;
    $('protocolo').value = r.protocolo;
    informar('Sua chave individual foi emitida. Guarde-a em local seguro. Caso houvesse uma chave anterior, ela foi invalidada.');
  });
});
$('copiarChave').addEventListener('click', () => void executar(async () => {
  if (!$('novaChave').value) throw Error('Nenhuma chave foi emitida.');
  await navigator.clipboard.writeText($('novaChave').value);
  informar('Chave copiada. Guarde-a em local seguro.');
}));
$('consultarNova').addEventListener('click', () => {
  $('chave').value = $('novaChave').value;
  $('novaChave').value = '';
  $('novaChaveArea').hidden = true;
  $('protocolo').scrollIntoView({behavior: 'smooth', block: 'center'});
});
(async () => {
  try {
    const r = await fetch('./seguranca/config-consulta-publica.json', {
      cache: 'no-store', credentials: 'omit', redirect: 'error', referrerPolicy: 'no-referrer'
    });
    if (!r.ok) throw Error('Configuração ainda não liberada.');
    cliente = criarClienteConsulta(await r.json());
    $('manutencao').hidden = true;
    $('funcional').hidden = false;
  } catch {
    cliente = null;
    $('funcional').hidden = true;
    $('manutencao').hidden = false;
  }
})();
