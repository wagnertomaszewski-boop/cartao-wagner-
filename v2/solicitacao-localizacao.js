(function () {
  'use strict';
  const campo = document.getElementById('localidade');
  const formulario = document.getElementById('formSolicitacao');
  if (!campo || !formulario || document.getElementById('solLocalizacao')) return;

  const selecao = { latitude: null, longitude: null };
  window.solicitacaoLocalizacao = selecao;

  const estilos = document.createElement('style');
  estilos.textContent = [
    '#solLocalizacao{margin:14px 0 18px;padding:15px;border:1px solid #c8d9eb;border-radius:15px;background:#f5f9ff;color:#173a5c}',
    '#solLocalizacao .sol-loc-titulo{font-size:16px;font-weight:800;margin-bottom:5px}',
    '#solLocalizacao .sol-loc-aviso{font-size:13px;line-height:1.45;margin:0 0 12px;color:#53677a}',
    '#solLocalizacao .sol-loc-acoes{display:flex;flex-wrap:wrap;gap:8px}',
    '#solLocalizacao button{width:auto;max-width:100%;margin:0;border:1px solid #0b63ad;border-radius:10px;background:#fff;color:#07569b;font:inherit;font-weight:700;font-size:14px;padding:10px 12px;min-height:42px;cursor:pointer}',
    '#solLocalizacao button:disabled{opacity:.5;cursor:not-allowed}',
    '#solLocalizacao #solRemoverLoc{border-color:#bcc7d1;color:#4e6071}',
    '#solLocalizacao #solMapaConfirmar{background:#0b63ad;color:white}',
    '#solLocalizacao .sol-loc-status{margin:10px 0 0;line-height:1.45;font-size:13px}',
    '#solLocalizacao .sol-loc-status:empty{display:none}',
    '#solMapaBox{margin-top:12px}',
    '#solMapaBox[hidden],#solRemoverLoc[hidden]{display:none!important}',
    '#solMapa{height:310px;min-height:310px;width:100%;border-radius:12px;overflow:hidden;border:1px solid #cbd6df;background:#e3e9e3;margin:10px 0}',
    '#solLocalizacao .sol-loc-rodape{font-size:12px;line-height:1.45;color:#64768a;margin:10px 0 0}'
  ].join('\n');
  document.head.appendChild(estilos);

  const caixa = document.createElement('section');
  caixa.id = 'solLocalizacao';
  caixa.setAttribute('aria-label', 'Localização do problema');
  caixa.innerHTML = [
    '<div class="sol-loc-titulo">📍 Localização do problema (opcional)</div>',
    '<p class="sol-loc-aviso">Envie o ponto onde está o problema. Se estiver em outro lugar, marque-o no mapa. A localização só será enviada com sua autorização e ficará restrita à equipe do mandato.</p>',
    '<div class="sol-loc-acoes">',
      '<button id="solUsarGps" type="button">📍 Usar minha localização atual</button>',
      '<button id="solAbrirMapa" type="button">🗺️ Marcar no mapa</button>',
      '<button id="solRemoverLoc" type="button" hidden>Remover ponto</button>',
    '</div>',
    '<p id="solStatusLoc" class="sol-loc-status" role="status" aria-live="polite"></p>',
    '<div id="solMapaBox" hidden>',
      '<p class="sol-loc-aviso">Toque no mapa para escolher o lugar exato do problema; depois confirme.</p>',
      '<div id="solMapa" aria-label="Mapa para selecionar o local do problema"></div>',
      '<div class="sol-loc-acoes">',
        '<button id="solMapaConfirmar" type="button" disabled>Confirmar este ponto</button>',
        '<button id="solMapaFechar" type="button">Fechar mapa</button>',
      '</div>',
    '</div>',
    '<p class="sol-loc-rodape">A localização é opcional. Se não quiser compartilhar, preencha apenas a localidade acima e envie normalmente.</p>'
  ].join('');
  campo.insertAdjacentElement('afterend', caixa);

  const elemento = id => document.getElementById(id);
  const status = mensagem => { elemento('solStatusLoc').textContent = mensagem; };
  let mapa = null;
  let marcador = null;
  let pontoPendente = null;

  function pontoValido(latitude, longitude) {
    return Number.isFinite(latitude) && Number.isFinite(longitude) &&
      latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180;
  }

  function atualizarPonto(latitude, longitude, mensagem) {
    const lat = Number(latitude);
    const lng = Number(longitude);
    if (!pontoValido(lat, lng)) {
      status('Não foi possível identificar um ponto válido. Tente novamente.');
      return;
    }
    selecao.latitude = Number(lat.toFixed(6));
    selecao.longitude = Number(lng.toFixed(6));
    elemento('solRemoverLoc').hidden = false;
    status(mensagem || 'Ponto selecionado! Ele será enviado junto com esta solicitação.');
  }

  elemento('solUsarGps').addEventListener('click', function () {
    if (!navigator.geolocation) {
      status('Seu navegador não oferece localização. Use o mapa ou informe a localidade por escrito.');
      return;
    }
    const botao = this;
    botao.disabled = true;
    status('Aguardando sua autorização de localização...');
    navigator.geolocation.getCurrentPosition(
      posicao => {
        atualizarPonto(posicao.coords.latitude, posicao.coords.longitude,
          'Localização recebida! Confira se você está no local do problema. Se não estiver, marque o ponto no mapa.');
        botao.disabled = false;
      },
      erro => {
        const mensagem = erro && erro.code === 1
          ? 'Permissão não concedida. Você pode marcar no mapa ou enviar sem localização.'
          : 'Não foi possível obter o GPS. Marque no mapa ou informe a localidade por escrito.';
        status(mensagem);
        botao.disabled = false;
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  });

  function marcarNoMapa(latitude, longitude) {
    pontoPendente = { latitude: latitude, longitude: longitude };
    if (marcador) {
      marcador.setLatLng([latitude, longitude]);
    } else {
      marcador = window.L.marker([latitude, longitude]).addTo(mapa);
    }
    elemento('solMapaConfirmar').disabled = false;
    status('Ponto marcado no mapa. Toque em "Confirmar este ponto" para incluí-lo no pedido.');
  }

  elemento('solAbrirMapa').addEventListener('click', function () {
    if (!window.L) {
      status('O mapa ainda não carregou. Confira sua conexão e tente novamente; você também pode informar a localidade por escrito.');
      return;
    }
    const container = elemento('solMapaBox');
    container.hidden = false;
    const inicial = selecao.latitude === null
      ? [-31.0046, -52.0436]
      : [selecao.latitude, selecao.longitude];
    if (!mapa) {
      mapa = window.L.map('solMapa', { scrollWheelZoom: false }).setView(inicial, 12);
      window.L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(mapa);
      mapa.on('click', evento => marcarNoMapa(evento.latlng.lat, evento.latlng.lng));
    }
    mapa.setView(inicial, selecao.latitude === null ? 12 : 16);
    pontoPendente = null;
    elemento('solMapaConfirmar').disabled = true;
    if (selecao.latitude !== null) {
      if (marcador) marcador.setLatLng(inicial);
      else marcador = window.L.marker(inicial).addTo(mapa);
    } else if (marcador) {
      mapa.removeLayer(marcador);
      marcador = null;
    }
    status('Toque no mapa para escolher o ponto do problema.');
    setTimeout(() => mapa.invalidateSize(), 100);
  });

  elemento('solMapaConfirmar').addEventListener('click', function () {
    if (!pontoPendente) return;
    atualizarPonto(pontoPendente.latitude, pontoPendente.longitude,
      'Local do problema confirmado no mapa! Ele será enviado junto com esta solicitação.');
    elemento('solMapaBox').hidden = true;
    pontoPendente = null;
  });

  elemento('solMapaFechar').addEventListener('click', function () {
    elemento('solMapaBox').hidden = true;
    pontoPendente = null;
    if (selecao.latitude !== null) {
      status('O ponto anteriormente escolhido está salvo para esta solicitação.');
    } else {
      status('Nenhuma localização selecionada. Você pode enviar normalmente.');
    }
  });

  function limparPonto() {
    selecao.latitude = null;
    selecao.longitude = null;
    pontoPendente = null;
    elemento('solRemoverLoc').hidden = true;
    elemento('solMapaBox').hidden = true;
    elemento('solMapaConfirmar').disabled = true;
    if (marcador && mapa) {
      mapa.removeLayer(marcador);
      marcador = null;
    }
    status('');
  }

  elemento('solRemoverLoc').addEventListener('click', limparPonto);
  formulario.addEventListener('reset', limparPonto);
})();
