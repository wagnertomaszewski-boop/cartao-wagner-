import {createHmac,randomBytes} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {LIMITE_CORPO_ANEXO_BYTES} from '../validacao-arquivo-hml.mjs';
import {criarRepositorio} from './repositorio.mjs';
import {criarHandlerProducao} from './http.mjs';

const base='/hml/candidata';
const nomeRecibo='__Secure-mandato_hml_recibo';
const caminhoRecibo=base+'/api/v1/recuperacao';
const formatoRecibo=/^([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\.([A-Za-z0-9_-]{43})$/i;

function recuperacaoNoNavegador(repositorio,req,res){
 const gravar=(valor,idade)=>res.setHeader('Set-Cookie',
  nomeRecibo+'='+valor+'; Path='+caminhoRecibo+'; Max-Age='+idade+'; Secure; HttpOnly; SameSite=Strict');
 return {
  ...repositorio,
  async solicitarRecuperacao(dados){
   const {pedidoId,recibo}=await repositorio.solicitarRecuperacao(dados);
   // A mesma resposta e o mesmo cookie são emitidos inclusive para pedidos fictícios sem correspondência.
   gravar(pedidoId+'.'+recibo,86400);
   return {recebido:true};
  },
  async validarCodigo({codigo}){
   const cookies=(req.headers.cookie||'').split(';').map(parte=>parte.trim());
   const prefixo=nomeRecibo+'=';
   const candidatos=cookies.filter(parte=>parte.startsWith(prefixo));
   const credencial=candidatos.length===1?formatoRecibo.exec(candidatos[0].slice(prefixo.length)):null;
   if(!credencial)return {validado:false,reciboAusente:true};
   const [,pedidoId,recibo]=credencial;
   const resultado=await repositorio.validarCodigo({pedidoId,recibo,codigo});
   if(resultado.validado===true)gravar('',0);
   return resultado;
  }
 };
}
const arquivos=new Map([
 ['cidadao','candidata.html'],['painel','candidata.html'],['app.js','candidata.js'],['telefone.js','../web/telefone.mjs']
]);
const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff',
 'Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'none'; script-src 'self'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'"};
const painelCsp=headers['Content-Security-Policy']+"; style-src 'self'; img-src 'self' https://tile.openstreetmap.org data:";
const json=(res,status,body)=>{
 res.writeHead(status,{...headers,'Content-Type':'application/json'});
 res.end(JSON.stringify(body));return true;
};
const hostTeste='ep-sweet-shape-bejhudcn-pooler.c-9.us-east-2.aws.neon.tech';
const papelTeste='mandato_candidata_hml';

async function iniciar({urlTeste,segredoBase}){
 if(process.env.RENDER==='true'||urlTeste){
  const url=new URL(urlTeste);
  if(url.protocol!=='postgresql:'||url.hostname!==hostTeste||url.pathname!=='/'+papelTeste||url.username!==papelTeste||
   !url.password||url.hash||url.port||typeof segredoBase!=='string'||segredoBase.length<32)
   throw Error('Conexão exclusiva de homologação obrigatória');
  url.search='';
  const {default:pg}=await import('pg');
  const pool=new pg.Pool({connectionString:url.href,ssl:{rejectUnauthorized:true},max:2,connectionTimeoutMillis:8000});
  try{
   const {rows:[prova]}=await pool.query(`SELECT current_database()=$1 AND current_user=$1
    AND NOT has_schema_privilege(current_user,'public','CREATE')
    AND NOT has_table_privilege(current_user,'mandato_privado.auditoria_recuperacao','UPDATE')
    AND has_table_privilege(current_user,'mandato_privado.storage_teste','SELECT,INSERT') AS ok`,[papelTeste]);
   if(prova?.ok!==true)throw Error('Privilégios de homologação incompatíveis');
  }catch(erro){
   await pool.end().catch(()=>{});
   throw erro;
  }
  return {banco:'Neon exclusivo',async executar(fn){
   const client=await pool.connect();
   try{return await fn(montarRepositorio((q,p)=>client.query(q,p),segredoBase));}
   finally{client.release();}
  }};
 }
 const {PGlite}=await import('@electric-sql/pglite');
 const db=new PGlite();
 for(const path of ['./homologacao-esquema.sql','../sql/rascunhos/20261115_estrutura_privada_recuperacao_producao.sql','./sql/estrutura-candidata.sql','./sql/contatos-legados-candidata.sql']){
  await db.exec(await readFile(new URL(path,import.meta.url),'utf8'));
 }
 await db.exec('CREATE TABLE mandato_privado.storage_teste (caminho text PRIMARY KEY, bytes bytea NOT NULL); GRANT SELECT, INSERT ON mandato_privado.storage_teste TO mandato_api_privada; SET ROLE mandato_api_privada;');
 const repo=montarRepositorio((q,p)=>db.query(q,p),randomBytes(32).toString('hex'));
 return {banco:'PGlite isolado',executar:fn=>fn(repo),fechar:()=>db.close()};
}

function montarRepositorio(query,segredoBase){
 const derivar=contexto=>createHmac('sha256',segredoBase).update(contexto).digest('hex');
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
 const repo=criarRepositorio({pool,storage,segredo:derivar('candidata-hml/operacoes'),segredoChaves:derivar('candidata-hml/chaves')});
 return {...repo,async localizacao(protocolo){
  const {rows:[ponto]}=await query(`SELECT latitude::float8 AS latitude, longitude::float8 AS longitude, localizacao_origem AS origem
   FROM public.solicitacoes WHERE protocolo=$1 AND localizacao_autorizada_em IS NOT NULL
   AND latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180
   AND localizacao_origem IN ('gps','mapa')`,[protocolo]);
  return ponto??null;
 }};
}
export function criarCandidataHml({origem,verificarMfa,urlTeste,segredoBase}){
 let inicializacao, fila=Promise.resolve(), pendentes=0;
 // Reutiliza a conexão saudável e libera uma inicialização rejeitada para a próxima chamada.
 const preparar=()=>inicializacao??=iniciar({urlTeste,segredoBase}).catch(erro=>{
  inicializacao=undefined;
  throw erro;
 });
 const handler=async(req,res)=>{
  const path=req.url?.split('?')[0];
  if(!path?.startsWith(base+'/'))return false;
  const rota=path.slice(base.length+1);
  if(req.method==='GET'&&arquivos.has(rota)){
   const arquivo=arquivos.get(rota);
   res.writeHead(200,{...headers,...(rota==='painel'?{'Content-Security-Policy':painelCsp}:{}),'Content-Type':rota.endsWith('.js')?'text/javascript; charset=utf-8':'text/html; charset=utf-8'});
   res.end(await readFile(new URL('./homologacao-web/'+arquivo,import.meta.url)));return true;
  }
  if(rota==='versao'&&req.method==='GET'){
   try{
    const {banco}=await preparar();
    return json(res,200,{api:'candidata',ambiente:'homologacao',base:'5b79918',deploy:process.env.RENDER_GIT_COMMIT??null,banco,storage:'privado de teste'});
   }catch(e){console.error('Candidata HML indisponível',e.code??e.name);return json(res,503,{erro:'Candidata indisponível'});}
  }
  if(!rota.startsWith('api/v1/')||req.method!=='POST')return json(res,404,{erro:'Rota indisponível'});
  if(req.headers.origin!==origem||req.headers['sec-fetch-site']==='cross-site')return json(res,403,{erro:'Origem não autorizada'});
  let operador=null;
  if(rota.startsWith('api/v1/admin/')){
   try{operador=await verificarMfa(req);if(!operador?.usuarioId)throw Error('Sessão inválida');}catch{return json(res,403,{erro:'Entre novamente na homologação e confirme o MFA.'});}
  }
  // PGlite usa uma única conexão. Serializa as transações do repositório.
  const processar=async()=>{
   try{
    const banco=await preparar();
    req.url='/'+rota;
    delete req.headers.authorization;
    const interno=operador?randomBytes(24).toString('base64url'):null;
    if(interno)req.headers.authorization='Bearer '+interno;
    await banco.executar(async repositorio=>{
     if(rota==='api/v1/admin/solicitacoes/localizacao'){
      if(!await repositorio.limitarEntrada('api-v1-global'))return json(res,429,{erro:'Aguarde.'});
      if(!/^application\/json(?:;|$)/i.test(req.headers['content-type']??''))return json(res,415,{erro:'Envie JSON.'});
      let corpo='';
      for await(const parte of req){
       corpo+=parte.toString();
       if(corpo.length>512)return json(res,413,{erro:'Protocolo inválido.'});
      }
      let dados;
      try{dados=JSON.parse(corpo);}catch{return json(res,400,{erro:'Protocolo inválido.'});}
      if(typeof dados?.protocolo!=='string'||!/^HML-CANDIDATA-\d{6,}$/.test(dados.protocolo))
       return json(res,400,{erro:'Informe um protocolo da candidata.'});
      return json(res,200,{ponto:await repositorio.localizacao(dados.protocolo)});
     }
     const handler=criarHandlerProducao({repositorio:recuperacaoNoNavegador(repositorio,req,res),origemApi:origem,
      resolverAdminMfa:async token=>interno&&token===interno?{usuarioId:operador.usuarioId,mfaRecente:true}:null});
     await handler(req,res);
    });
   }catch(e){console.error('Candidata HML indisponível',e.code??e.name);if(!res.headersSent)json(res,503,{erro:'Candidata indisponível'});else res.end();}
  };
  if(Number(req.headers['content-length'])>(rota==='api/v1/arquivos/anexar'?LIMITE_CORPO_ANEXO_BYTES:20000))return json(res,413,{erro:'Corpo excede o limite da operação.'});
  if(pendentes>=12)return json(res,429,{erro:'Ambiente de teste ocupado. Tente novamente.'});
  pendentes++;
  const atual=fila.then(processar);
  fila=atual.catch(()=>{});
  try{await atual;}finally{pendentes--;}
  return true;
 };
 handler.preparar=preparar;
 handler.fechar=async()=>{const banco=await inicializacao;await banco?.fechar?.();};
 return handler;
}
