// API de produção isolada: bloqueia cadastros até credenciais e chave HMAC configuradas.
import http from 'node:http';
import { Pool } from 'pg';
import { criarHandlerCadastroProducao } from '../../homologacao/api-neon/preproducao/handler-cadastro-producao.mjs';
const porta=Number(process.env.PORT||10000);
const origemPermitida=process.env.V2_ORIGIN||'https://wagnertomaszewski-boop.github.io';
const conexao=process.env.PRODUCAO_DATABASE_URL;
const segredo=process.env.PRODUCAO_HMAC_SECRET;
const ativo=!!(conexao&&segredo&&Buffer.byteLength(segredo)>=32&&process.env.PRODUCAO_CADASTRO_ATIVO==='sim');
const pool=conexao&&segredo&&Buffer.byteLength(segredo)>=32?new Pool({connectionString:conexao,ssl:{rejectUnauthorized:true},max:5,connectionTimeoutMillis:5000}):null;
const handler=ativo?criarHandlerCadastroProducao({pool,segredoServidor:segredo}):null;
// Limite por instância; antes de habilitar produção com múltiplas instâncias, substituir por limite persistente.
const tentativas=new Map();
function permitir(ip){const agora=Date.now();if(tentativas.size>20000)tentativas.clear();const t=tentativas.get(ip);if(!t||agora-t.inicio>60000){tentativas.set(ip,{inicio:agora,contagem:1});return true;}t.contagem++;return t.contagem<=5;}
const responder=(res,status,obj,origem)=>{res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff',...(origem?{'access-control-allow-origin':origem,'vary':'Origin'}:{})});res.end(JSON.stringify(obj));};
http.createServer(async(req,res)=>{
 const origin=req.headers.origin;
 if(req.url==='/saude'&&req.method==='GET')return responder(res,200,{servico:'mandato-api-producao',cadastro:ativo?'configurado':'bloqueado'});
 if(req.url==='/saude/banco'&&req.method==='GET'){
  if(!pool)return responder(res,503,{banco:'nao_configurado'});
  try {await pool.query('SELECT 1');return responder(res,200,{banco:'acessivel'});}
  catch {return responder(res,503,{banco:'indisponivel'});}
 }
 if(req.url!=='/api/solicitacoes')return responder(res,404,{erro:'Não encontrado'});
 if(origin!==origemPermitida)return responder(res,403,{erro:'Origem não autorizada'});
 if(req.method==='OPTIONS'){res.writeHead(204,{'access-control-allow-origin':origin,'access-control-allow-methods':'POST, OPTIONS','access-control-allow-headers':'content-type','vary':'Origin'});return res.end();}
 if(!ativo)return responder(res,503,{erro:'Cadastro ainda não habilitado'},origin);
 if(!permitir(req.socket.remoteAddress||'desconhecido'))return responder(res,429,{erro:'Muitas tentativas; aguarde'},origin);
 if(req.method!=='POST')return responder(res,405,{erro:'Método não permitido'},origin);
 if(Number(req.headers['content-length']||0)>32768)return responder(res,413,{erro:'Requisição muito grande'},origin);
 let raw='';try{
  for await(const chunk of req){raw+=chunk;if(Buffer.byteLength(raw)>32768)throw Error('limite');}
  const corpo=JSON.parse(raw);
  const resposta=await handler({metodo:'POST',corpo});
  return responder(res,resposta.status,resposta.corpo,origin);
 }catch{return responder(res,400,{erro:'Requisição inválida'},origin);}
}).listen(porta,'0.0.0.0',()=>console.log('API produção iniciada; cadastro '+(ativo?'configurado':'bloqueado')));
