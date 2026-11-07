// API HTTP de homologação: fechada por padrão.
// Nenhuma credencial PostgreSQL ou dado real deve ser incluído neste arquivo.
import http from 'node:http';

export function criarServidor({porta=0}={}) {
  return http.createServer(async (req,res)=>{
    const send=(status,obj)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(obj));};
    if(req.headers.origin) return send(403,{erro:'Origem não autorizada'});
    if(req.url==='/health' && req.method==='GET') return send(200,{status:'ok',modo:'homologacao-sem-banco'});
    const rotas=new Set(['/api/recuperacao/solicitar','/api/admin/recuperacoes','/api/solicitacoes/consultar']);
    if(req.url?.startsWith('/api/admin/recuperacoes/')) return send(503,{erro:'Integração administrativa ainda não habilitada'});
    if(rotas.has(req.url)) return send(503,{erro:'Integração com banco ainda não habilitada'});
    return send(404,{erro:'Rota não encontrada'});
  });
}
if(process.argv[1] && import.meta.url===new URL('file://'+process.argv[1]).href) {
  const port=Number(process.env.PORT||8787);
  criarServidor().listen(port,'127.0.0.1',()=>console.log('Servidor local de homologação na porta '+port));
}
