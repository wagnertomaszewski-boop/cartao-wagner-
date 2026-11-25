import {randomBytes} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {criarRepositorio} from './repositorio.mjs';
import {criarHandlerProducao} from './http.mjs';

const base='/hml/candidata';
const arquivos=new Map([
 ['cidadao','candidata.html'],['painel','candidata.html'],['app.js','candidata.js']
]);
const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff',
 'Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'none'; script-src 'self'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'"};
const json=(res,status,body)=>{
 res.writeHead(status,{...headers,'Content-Type':'application/json'});
 res.end(JSON.stringify(body));return true;
};
async function iniciar(){
 const db=new PGlite();
 for(const path of ['./homologacao-esquema.sql','../sql/rascunhos/20261115_estrutura_privada_recuperacao_producao.sql','./sql/estrutura-candidata.sql','./sql/contatos-legados-candidata.sql']){
  await db.exec(await readFile(new URL(path,import.meta.url),'utf8'));
 }
 await db.exec('CREATE TABLE mandato_privado.storage_teste (caminho text PRIMARY KEY, bytes bytea NOT NULL); GRANT SELECT, INSERT ON mandato_privado.storage_teste TO mandato_api_privada; SET ROLE mandato_api_privada;');
 const query=(q,p)=>db.query(q,p);
 const pool={query,connect:async()=>({query,release(){}})};
 const storage={
  async enviar(caminho,bytes){
   const {rows:[{total}]}=await query('SELECT count(*) AS total FROM mandato_privado.storage_teste');
   if(Number(total)>=30)throw Object.assign(Error('Storage de teste cheio.'),{status:429});
   await query('INSERT INTO mandato_privado.storage_teste(caminho,bytes) VALUES ($1,$2)',[caminho,bytes]);
  },
  async baixar(caminho){
   const {rows:[objeto]}=await query('SELECT bytes FROM mandato_privado.storage_teste WHERE caminho=$1',[caminho]);
   if(!objeto)throw Object.assign(Error('Arquivo indisponível.'),{status:404});
   return Buffer.from(objeto.bytes);
  }
 };
 return criarRepositorio({pool,storage,segredo:randomBytes(32).toString('hex'),segredoChaves:randomBytes(32).toString('hex')});
}
export function criarCandidataHml({origem,verificarMfa}){
 let inicializacao, fila=Promise.resolve(), pendentes=0;
 const preparar=()=>inicializacao??=iniciar();
 const handler=async(req,res)=>{
  const path=req.url?.split('?')[0];
  if(!path?.startsWith(base+'/'))return false;
  const rota=path.slice(base.length+1);
  if(req.method==='GET'&&arquivos.has(rota)){
   const arquivo=arquivos.get(rota);
   res.writeHead(200,{...headers,'Content-Type':arquivo.endsWith('.js')?'text/javascript; charset=utf-8':'text/html; charset=utf-8'});
   res.end(await readFile(new URL('./homologacao-web/'+arquivo,import.meta.url)));return true;
  }
  if(rota==='versao'&&req.method==='GET'){
   try{
    await preparar();
    return json(res,200,{api:'candidata',ambiente:'homologacao',base:'5b79918',deploy:process.env.RENDER_GIT_COMMIT??null,banco:'PGlite isolado',storage:'privado de teste'});
   }catch(e){console.error('Candidata HML indisponível',e.code??e.name);return json(res,503,{erro:'Candidata indisponível'});}
  }
  if(!rota.startsWith('api/v1/')||req.method!=='POST')return json(res,404,{erro:'Rota indisponível'});
  if(req.headers.origin!==origem||req.headers['sec-fetch-site']==='cross-site')return json(res,403,{erro:'Origem não autorizada'});
  let operador=null;
  if(rota.startsWith('api/v1/admin/')){
   try{operador=await verificarMfa(req);}catch{return json(res,403,{erro:'Entre novamente na homologação e confirme o MFA.'});}
  }
  // PGlite usa uma única conexão. Serializa as transações do repositório.
  const processar=async()=>{
   try{
    const repositorio=await preparar();
    req.url='/'+rota;
    delete req.headers.authorization;
    const interno=operador?randomBytes(24).toString('base64url'):null;
    if(interno)req.headers.authorization='Bearer '+interno;
    const handler=criarHandlerProducao({repositorio,origemApi:origem,
     resolverAdminMfa:async token=>interno&&token===interno?{usuarioId:operador.usuarioId,mfaRecente:true}:null});
    await handler(req,res);
   }catch(e){console.error('Candidata HML indisponível',e.code??e.name);if(!res.headersSent)json(res,503,{erro:'Candidata indisponível'});else res.end();}
  };
  if(req.headers['content-length']>1500000)return json(res,413,{erro:'Arquivo excede o limite'});
  if(pendentes>=12)return json(res,429,{erro:'Ambiente de teste ocupado. Tente novamente.'});
  pendentes++;
  const atual=fila.then(processar);
  fila=atual.catch(()=>{});
  try{await atual;}finally{pendentes--;}
  return true;
 };
 handler.preparar=preparar;
 return handler;
}
