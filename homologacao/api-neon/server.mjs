import http from 'node:http';
import {criarLimitador} from './limitador.mjs';

// Handlers são injetados apenas pelo servidor, nunca definidos pelo navegador.
// Sem handlers, as operações permanecem indisponíveis.
export function criarServidor({verificarAdmin = async () => false, operacoes = {}, limitador = criarLimitador(), verificarIdentidade = async () => false, origensPermitidas = []} = {}) {
  return http.createServer(async (req, res) => {
    const origem = req.headers.origin;
    const origemAutorizada = typeof origem === 'string' && origensPermitidas.includes(origem);
    const cabecalhosCors = origemAutorizada ? {'Access-Control-Allow-Origin':origem,'Vary':'Origin'} : {};
    const send = (status, data) => {
      res.writeHead(status, {'Content-Type':'application/json; charset=utf-8', 'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff',...cabecalhosCors});
      res.end(JSON.stringify(data));
    };
    if (origem && !origemAutorizada) return send(403, {erro:'Origem não autorizada'});
    if (req.method === 'OPTIONS' && origemAutorizada) {
      res.writeHead(204,{...cabecalhosCors,'Access-Control-Allow-Methods':'GET, POST, OPTIONS','Access-Control-Allow-Headers':'Authorization, Content-Type','Access-Control-Max-Age':'600','Cache-Control':'no-store'});
      return res.end();
    }
    if (req.url === '/health' && req.method === 'GET') return send(200, {status:'ok', modo:'homologacao', rotasCidadaoHabilitadas:typeof operacoes.solicitar==='function' && typeof operacoes.consultar==='function'});
    const adminLista = req.url === '/api/admin/recuperacoes' && req.method === 'GET';
    const adminDecisao = /^\/api\/admin\/recuperacoes\/([0-9]+)\/decisao$/.exec(req.url || '');
    const admin = adminLista || (adminDecisao && req.method === 'POST');
    const solicitar = req.url === '/api/recuperacao/solicitar' && req.method === 'POST';
    const consultar = req.url === '/api/solicitacoes/consultar' && req.method === 'POST';
    if (!admin && !solicitar && !consultar) return send(404, {erro:'Rota não encontrada'});
    if (solicitar || consultar) {
      // Endereço da conexão TCP, nunca X-Forwarded-For fornecido pelo cliente.
      // Uso apenas em homologação local; produção requer limite distribuído.
      const endereco = req.socket.remoteAddress || 'desconhecido';
      if (!limitador.verificar(endereco + ':' + (solicitar ? 'recuperar' : 'consultar')))
        return send(429, {erro:'Muitas tentativas. Tente novamente mais tarde.'});
    }
    if (admin) {
      const header = req.headers.authorization || '';
      if (!/^Bearer [^\s]+$/.test(header)) return send(401, {erro:'Autenticação necessária'});
      let autorizado = false;
      try { autorizado = await verificarAdmin(header.slice(7)); } catch { autorizado = false; }
      if (autorizado !== true) return send(403, {erro:'Acesso negado'});
    }
    const handler = adminLista ? operacoes.listar : adminDecisao ? operacoes.decidir : solicitar ? operacoes.solicitar : operacoes.consultar;
    if (typeof handler !== 'function') return send(503, {erro:'Integração com banco ainda não habilitada'});
    let dados = {};
    if (req.method === 'POST') {
      if (!/^application\/json(?:\s*;|$)/i.test(req.headers['content-type'] || '')) return send(415, {erro:'Envie JSON'});
      let corpo = '';
      try {
        for await (const parte of req) {
          corpo += parte;
          if (Buffer.byteLength(corpo) > 4096) return send(413, {erro:'Requisição muito grande'});
        }
        dados = JSON.parse(corpo);
        if (!dados || Array.isArray(dados) || typeof dados !== 'object') return send(400, {erro:'JSON inválido'});
      } catch { return send(400, {erro:'JSON inválido'}); }
    }
    if (adminDecisao && req.method === 'POST') {
      // A confirmação enviada pelo navegador nunca é prova de identidade.
      let confirmada = false;
      try { confirmada = await verificarIdentidade({pedidoId:adminDecisao[1], token:req.headers.authorization.slice(7)}); } catch { confirmada = false; }
      if (confirmada !== true) return send(403,{erro:'Identidade não confirmada pelo servidor'});
    }
    try {
      const resultado = await handler({dados, pedidoId: adminDecisao?.[1]});
      return send(200, resultado);
    } catch { return send(503, {erro:'Operação indisponível'}); }
  });
}
if (process.argv[1] && import.meta.url === new URL('file://' + process.argv[1]).href) {
  criarServidor().listen(Number(process.env.PORT || 8787), '127.0.0.1');
}
