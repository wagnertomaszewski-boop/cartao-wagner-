import http from 'node:http';

// O verificador deve ser fornecido pelo backend; nunca confiar em token sem validação.
export function criarServidor({verificarAdmin = async () => false} = {}) {
  return http.createServer(async (req, res) => {
    const send = (status, data) => {
      res.writeHead(status, {'Content-Type':'application/json; charset=utf-8', 'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff'});
      res.end(JSON.stringify(data));
    };
    if (req.headers.origin) return send(403, {erro:'Origem não autorizada'});
    if (req.url === '/health' && req.method === 'GET') return send(200, {status:'ok', modo:'homologacao-sem-banco'});
    const admin = req.url === '/api/admin/recuperacoes' || /^\/api\/admin\/recuperacoes\/[0-9]+\/decisao$/.test(req.url || '');
    if (admin) {
      const header = req.headers.authorization || '';
      if (!/^Bearer [^\s]+$/.test(header)) return send(401, {erro:'Autenticação necessária'});
      let autorizado = false;
      try { autorizado = await verificarAdmin(header.slice(7)); } catch { autorizado = false; }
      if (autorizado !== true) return send(403, {erro:'Acesso negado'});
      return send(503, {erro:'Integração administrativa ainda não habilitada'});
    }
    if (req.url === '/api/recuperacao/solicitar' || req.url === '/api/solicitacoes/consultar')
      return send(503, {erro:'Integração com banco ainda não habilitada'});
    return send(404, {erro:'Rota não encontrada'});
  });
}
if (process.argv[1] && import.meta.url === new URL('file://' + process.argv[1]).href) {
  criarServidor().listen(Number(process.env.PORT || 8787), '127.0.0.1');
}
