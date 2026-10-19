(function () {
  "use strict";

  const secao = document.getElementById("viewSolicitacoes");
  const filtros = secao && secao.querySelector(".filtros-box");
  if (!filtros || document.getElementById("solMapaGeralCard")) return;

  const estilo = document.createElement("style");
  estilo.textContent = [
    "#solMapaGeralCard{margin:15px 0;padding:16px;background:#f3f8fe;border:1px solid #c9dff3;border-radius:18px;color:#183955}",
    "#solMapaGeralCard [hidden]{display:none!important}",
    ".sol-mapa-geral-topo{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px}",
    ".sol-mapa-geral-topo h3{font-size:18px;margin:0 0 5px;color:#123e68}",
    ".sol-mapa-geral-topo p{font-size:13px;margin:0;color:#597189;line-height:1.45}",
    "#solMapaGeralCard button{width:auto;margin:0;cursor:pointer}",
    "#solMapaGeralToggle{padding:11px 15px;border-radius:11px;background:#0b6cba;color:white;font-size:14px;font-weight:800}",
    "#solMapaGeralPainel{margin-top:16px}",
    ".sol-mapa-geral-priv{font-size:12px;color:#4c657b;line-height:1.5;margin:0 0 11px}",
    ".sol-mapa-geral-controles{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));align-items:end;gap:10px;margin-bottom:12px}",
    ".sol-mapa-geral-controles label{display:block;font-size:12px;font-weight:800;color:#37566f}",
    ".sol-mapa-geral-controles select{display:block;width:100%;margin:5px 0 0;min-height:44px;border-radius:10px;border:1px solid #b7c9d9;background:white;color:#183955;padding:8px}",
    "#solMapaGeralAtualizar{min-height:44px;border:1px solid #0b6cba;background:white;color:#075a9c;border-radius:10px;font-weight:800;padding:9px 12px}",
    "#solMapaGeralAtualizar:disabled{opacity:.5}",
    "#solMapaGeralEstado{font-size:13px;line-height:1.5;color:#52697c;margin:0 0 9px}",
    "#solMapaGeralMapa{height:350px;min-height:350px;width:100%;border:1px solid #b7cddb;background:#e2ebe8;border-radius:12px;overflow:hidden;z-index:0}",
    ".sol-mapa-geral-legenda{display:flex;flex-wrap:wrap;gap:7px 12px;font-size:12px;color:#456076;margin-top:11px}",
    ".sol-mapa-geral-legenda span{display:inline-flex;align-items:center;gap:5px}",
    ".sol-mapa-geral-legenda i{width:10px;height:10px;border-radius:50%;display:inline-block}",
    "#solMapaGeralLista{display:grid;gap:7px;margin-top:10px}",
    "#solMapaGeralLista button{width:100%;text-align:left;background:white;border:1px solid #d2e1ed;border-radius:9px;padding:10px;color:#16456b;font-size:13px}",
    ".sol-mapa-geral-subtitulo{font-size:13px;font-weight:800;color:#37566f;margin:16px 0 7px}",
    ".sol-mapa-geral-popup{display:grid;gap:7px;min-width:170px;font-size:13px;color:#183955}",
    ".sol-mapa-geral-popup strong{font-size:15px}",
    ".sol-mapa-geral-popup button{background:#0b6cba;color:white;border:0;padding:9px 12px;border-radius:9px;font-weight:750}",
    "@media(max-width:440px){#solMapaGeralCard{padding:12px}#solMapaGeralMapa{height:300px;min-height:300px}.sol-mapa-geral-topo button{width:100%!important}}"
  ].join("\n");
  document.head.appendChild(estilo);

  const cartao = document.createElement("section");
  cartao.id = "solMapaGeralCard";
  cartao.setAttribute("aria-label", "Mapa privado das solicitações");
  cartao.innerHTML = [
    '<div class="sol-mapa-geral-topo">',
      '<div><h3>🗺️ Mapa das solicitações</h3>',
      '<p>Veja onde estão as demandas da comunidade de Cristal.</p></div>',
      '<button id="solMapaGeralToggle" type="button" aria-expanded="false" aria-controls="solMapaGeralPainel">Abrir mapa privado</button>',
    '</div>',
    '<div id="solMapaGeralPainel" hidden>',
      '<p class="sol-mapa-geral-priv">🔒 Acesso exclusivo ao painel autorizado. Só entram no mapa solicitações cujos cidadãos compartilharam um ponto; nomes e telefones não aparecem nos marcadores.</p>',
      '<div class="sol-mapa-geral-controles">',
        '<label for="solMapaGeralStatus">Situação',
          '<select id="solMapaGeralStatus">',
            '<option value="Todos">Todas as situações</option>',
            '<option value="Recebida">Recebidas</option>',
            '<option value="Em análise">Em análise</option>',
            '<option value="Encaminhado">Encaminhadas</option>',
            '<option value="Em andamento">Em andamento</option>',
            '<option value="Concluído">Concluídas</option>',
          '</select>',
        '</label>',
        '<label for="solMapaGeralTipo">Tipo de problema',
          '<select id="solMapaGeralTipo"><option value="Todos">Todos os tipos</option></select>',
        '</label>',
        '<button id="solMapaGeralAtualizar" type="button">↻ Atualizar mapa</button>',
      '</div>',
      '<p id="solMapaGeralEstado" role="status" aria-live="polite">Abra o mapa para carregar as solicitações.</p>',
      '<div id="solMapaGeralMapa" role="region" aria-label="Mapa com os pontos das solicitações"></div>',
      '<div class="sol-mapa-geral-legenda" aria-label="Cores dos status">',
        '<span><i style="background:#2563eb"></i>Recebida</span>',
        '<span><i style="background:#d97706"></i>Em análise</span>',
        '<span><i style="background:#7c3aed"></i>Encaminhada</span>',
        '<span><i style="background:#0d9488"></i>Em andamento</span>',
        '<span><i style="background:#16a34a"></i>Concluída</span>',
      '</div>',
      '<h4 class="sol-mapa-geral-subtitulo">Pedidos no mapa (mais recentes)</h4>',
      '<div id="solMapaGeralLista"></div>',
    '</div>'
  ].join("");
  filtros.insertAdjacentElement("beforebegin", cartao);

  const elemento = id => document.getElementById(id);
  const botaoAbrir = elemento("solMapaGeralToggle");
  const botaoAtualizar = elemento("solMapaGeralAtualizar");
  const seletorStatus = elemento("solMapaGeralStatus");
  const seletorTipo = elemento("solMapaGeralTipo");
  const painel = elemento("solMapaGeralPainel");
  const aviso = elemento("solMapaGeralEstado");
  const listagem = elemento("solMapaGeralLista");

  const categorias = [
    "Infraestrutura e vias públicas",
    "Meio ambiente",
    "Iluminação pública",
    "Saúde",
    "Educação",
    "Outros"
  ];
  const semCategoria = "Sem categoria informada";
  const cores = {
    "Recebida": "#2563eb",
    "Em análise": "#d97706",
    "Encaminhado": "#7c3aed",
    "Em andamento": "#0d9488",
    "Concluído": "#16a34a"
  };

  let registros = [];
  let mapa = null;
  let camada = null;
  let marcadores = new Map();
  let geracao = 0;
  let incompleto = false;

  function normal(texto) {
    return String(texto || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  }

  function situacao(item) {
    const valor = normal(item.status);
    if (valor.startsWith("conclu")) return "Concluído";
    if (valor.includes("andamento")) return "Em andamento";
    if (valor.includes("encaminhad")) return "Encaminhado";
    if (valor.includes("analise")) return "Em análise";
    return "Recebida";
  }

  function tipo(item) {
    const assunto = String(item.assunto || "");
    const separador = assunto.indexOf(" — ");
    if (separador < 0) return semCategoria;
    const prefixo = normal(assunto.slice(0, separador));
    return categorias.find(categoria => normal(categoria) === prefixo) || semCategoria;
  }

  function coordenadas(item) {
    if (item.latitude === null || item.longitude === null ||
        item.latitude === undefined || item.longitude === undefined) return null;
    const latitude = Number(item.latitude);
    const longitude = Number(item.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) ||
        latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;
    return [latitude, longitude];
  }

  function mapaVisivel() {
    return !painel.hidden && elemento("telaLogin")?.style.display === "none";
  }

  function montarMapa() {
    if (mapa) return true;
    if (!window.L) {
      aviso.textContent = "Não foi possível carregar o mapa. Confira a conexão com a internet e tente novamente.";
      return false;
    }
    mapa = window.L.map("solMapaGeralMapa", { scrollWheelZoom: false }).setView([-31.0046, -52.0436], 12);
    window.L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap contributors"
    }).addTo(mapa);
    camada = window.L.layerGroup().addTo(mapa);
    return true;
  }

  async function abrirPedido(id) {
    const numero = Number(id);
    if (!Number.isSafeInteger(numero) || numero <= 0) return;
    const busca = elemento("filtroBusca");
    const filtro = elemento("filtroStatus");
    if (busca) busca.value = "";
    if (filtro) filtro.value = "Todos";
    document.querySelectorAll("#statusFiltros button").forEach(botao => {
      botao.classList.toggle("ativo", botao.dataset.status === "Todos");
    });
    await abrirSolicitacaoPorId(numero);
  }

  function adicionarPopup(item, marcador) {
    const conteudo = document.createElement("div");
    conteudo.className = "sol-mapa-geral-popup";
    const titulo = document.createElement("strong");
    titulo.textContent = String(item.protocolo || "Solicitação #" + item.id);
    const resumo = document.createElement("span");
    resumo.textContent = tipo(item) + " · " + situacao(item);
    const bairro = document.createElement("span");
    bairro.textContent = String(item.localidade || "");
    const abrir = document.createElement("button");
    abrir.type = "button";
    abrir.textContent = "Abrir solicitação ↗";
    abrir.addEventListener("click", () => abrirPedido(item.id));
    conteudo.append(titulo, resumo, bairro, abrir);
    marcador.bindPopup(conteudo, { maxWidth: 280 });
  }

  function configurarTipos() {
    const anterior = seletorTipo.value;
    const existentes = new Set(registros.map(tipo));
    const opcoes = categorias.filter(categoria => existentes.has(categoria));
    if (existentes.has(semCategoria)) opcoes.push(semCategoria);
    seletorTipo.replaceChildren();
    const todos = document.createElement("option");
    todos.value = "Todos";
    todos.textContent = "Todos os tipos";
    seletorTipo.appendChild(todos);
    opcoes.forEach(categoria => {
      const option = document.createElement("option");
      option.value = categoria;
      option.textContent = categoria;
      seletorTipo.appendChild(option);
    });
    seletorTipo.value = opcoes.includes(anterior) ? anterior : "Todos";
  }

  function redesenhar() {
    if (!mapa || !camada) return;
    camada.clearLayers();
    marcadores = new Map();
    listagem.replaceChildren();

    const filtrados = registros.filter(item =>
      (seletorStatus.value === "Todos" || situacao(item) === seletorStatus.value) &&
      (seletorTipo.value === "Todos" || tipo(item) === seletorTipo.value)
    );

    const total = registros.length;
    let mensagem = filtrados.length + " ponto(s) exibido(s) de " + total + " solicitação(ões) com localização.";
    if (incompleto) mensagem += " Foram carregados somente os 5.000 registros mais recentes.";
    if (!total) mensagem = "Ainda não há solicitações com localização compartilhada.";
    else if (!filtrados.length) mensagem = "Nenhuma solicitação corresponde aos filtros escolhidos.";
    aviso.textContent = mensagem;

    if (!filtrados.length) {
      mapa.setView([-31.0046, -52.0436], 12);
      return;
    }

    const posicoes = [];
    filtrados.forEach(item => {
      const pos = coordenadas(item);
      if (!pos) return;
      const marcador = window.L.circleMarker(pos, {
        radius: 11,
        color: "#ffffff",
        weight: 2,
        fillColor: cores[situacao(item)] || "#2563eb",
        fillOpacity: 0.95
      });
      marcador.addTo(camada);
      adicionarPopup(item, marcador);
      marcadores.set(Number(item.id), marcador);
      posicoes.push(pos);
    });

    filtrados.slice(0, 20).forEach(item => {
      const botao = document.createElement("button");
      botao.type = "button";
      botao.textContent = String(item.protocolo || "Solicitação #" + item.id) +
        " · " + tipo(item) + " · " + situacao(item);
      botao.addEventListener("click", () => {
        const marcador = marcadores.get(Number(item.id));
        if (!marcador) return;
        mapa.setView(marcador.getLatLng(), 16);
        marcador.openPopup();
      });
      listagem.appendChild(botao);
    });

    setTimeout(() => {
      if (!mapaVisivel() || !mapa) return;
      mapa.invalidateSize();
      if (posicoes.length === 1) mapa.setView(posicoes[0], 14);
      else if (posicoes.length > 1) mapa.fitBounds(posicoes, { padding: [25, 25], maxZoom: 15 });
    }, 75);
  }

  async function carregarMapa() {
    const chamada = ++geracao;
    if (!mapaVisivel() || !montarMapa()) return;
    botaoAtualizar.disabled = true;
    aviso.textContent = "Carregando pontos das solicitações autorizadas...";
    try {
      const sessao = await obterSessaoValida();
      if (chamada !== geracao || !mapaVisivel()) return;
      if (!sessao || !sessao.access_token) {
        window.painelMapaPrivadoLimpar();
        mostrarLogin("Sua sessão expirou. Entre novamente.");
        return;
      }
      const pagina = 500;
      const maximo = 5000;
      const recebidos = [];
      let paginaCheia = false;
      for (let offset = 0; offset < maximo; offset += pagina) {
        const url = SUPABASE_URL +
          "/rest/v1/solicitacoes?select=id,protocolo,status,assunto,localidade,latitude,longitude,criado_em" +
          "&latitude=not.is.null&longitude=not.is.null&order=id.desc&limit=" + pagina + "&offset=" + offset;
        const resposta = await requisicao(url, {
          headers: { apikey: SUPABASE_KEY, Authorization: "Bearer " + sessao.access_token }
        });
        if (chamada !== geracao || !mapaVisivel()) return;
        if (resposta.status === 401) {
          window.painelMapaPrivadoLimpar();
          mostrarLogin("Sua sessão expirou. Entre novamente.");
          return;
        }
        const corpo = await resposta.json().catch(() => null);
        if (!resposta.ok) throw new Error(corpo?.message || "Falha ao buscar as solicitações.");
        if (!Array.isArray(corpo)) throw new Error("Resposta inesperada do servidor.");
        recebidos.push(...corpo);
        paginaCheia = corpo.length === pagina;
        if (!paginaCheia) break;
      }
      if (chamada !== geracao || !mapaVisivel()) return;
      registros = recebidos.filter(item =>
        Number.isSafeInteger(Number(item.id)) && coordenadas(item) !== null
      );
      incompleto = recebidos.length >= maximo && paginaCheia;
      configurarTipos();
      redesenhar();
    } catch (erro) {
      if (chamada === geracao) aviso.textContent =
        "Não foi possível carregar o mapa: " + String(erro?.message || erro);
    } finally {
      if (chamada === geracao) botaoAtualizar.disabled = false;
    }
  }

  function limpar() {
    geracao++;
    registros = [];
    incompleto = false;
    if (mapa) {
      mapa.remove();
      mapa = null;
      camada = null;
    }
    marcadores.clear();
    listagem.replaceChildren();
    painel.hidden = true;
    botaoAbrir.textContent = "Abrir mapa privado";
    botaoAbrir.setAttribute("aria-expanded", "false");
    aviso.textContent = "Abra o mapa para carregar as solicitações.";
    botaoAtualizar.disabled = false;
  }

  window.painelMapaPrivadoLimpar = limpar;

  botaoAbrir.addEventListener("click", async () => {
    if (!painel.hidden) {
      painel.hidden = true;
      geracao++;
      botaoAbrir.textContent = "Abrir mapa privado";
      botaoAbrir.setAttribute("aria-expanded", "false");
      return;
    }
    if (elemento("telaLogin")?.style.display !== "none") return;
    painel.hidden = false;
    botaoAbrir.textContent = "Fechar mapa";
    botaoAbrir.setAttribute("aria-expanded", "true");
    await carregarMapa();
  });
  botaoAtualizar.addEventListener("click", carregarMapa);
  seletorStatus.addEventListener("change", redesenhar);
  seletorTipo.addEventListener("change", redesenhar);
})();
