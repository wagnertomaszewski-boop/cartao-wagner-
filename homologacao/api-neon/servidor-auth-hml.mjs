import {readFile} from 'node:fs/promises';
import {toNodeHandler,fromNodeHeaders} from 'better-auth/node';
import {criarAuthAdminHml,validarConfigAuthHml,segredoIgual,exigirAdminMfa,HML_ORIGIN} from './auth-admin-hml.mjs';
import {criarFluxoIsoladoHml} from './fluxo-isolado-hml.mjs';
import {criarEnvioWhatsappCloud} from './enviar-whatsapp-cloud.mjs';
const BASE='/hml';
export async function criarServidorAuthHml({env=process.env}={}){
 const {default:pg}=await import('pg');
 const pool=new pg.Pool(validarConfigAuthHml(env));
 try{
  const r=await pool.query("SELECT current_user AS usuario,has_table_privilege(current_user,'auth_admin_hml.auditoria','UPDATE') AS muda_auditoria,has_schema_privilege(current_user,'public','CREATE') AS cria_publico");
  if(r.rows[0]?.usuario!=='mandato_auth_hml'||r.rows[0].muda_auditoria!==false||r.rows[0].cria_publico!==false)throw Error('Privilégios incompatíveis');
  // Usa outro pool com search_path fixo desde a abertura de cada conexão.
  await pool.end();
  const authPool=new pg.Pool({...validarConfigAuthHml(env),options:'-c search_path=auth_admin_hml'});
  return await montar({env,pool:authPool});
 }catch(e){if(!pool.ended)await pool.end();throw e;}
}
export async function montar({env,pool}){
 const auth=criarAuthAdminHml({database:pool,secret:env.AUTH_HML_SECRET,adminEmail:env.AUTH_HML_ADMIN_EMAIL});
 let enviarCodigo=null;
 if(env.WHATSAPP_HML_TOKEN&&env.WHATSAPP_HML_PHONE_NUMBER_ID&&env.WHATSAPP_HML_TEMPLATE){
  enviarCodigo=criarEnvioWhatsappCloud({token:env.WHATSAPP_HML_TOKEN,phoneNumberId:env.WHATSAPP_HML_PHONE_NUMBER_ID,templateName:env.WHATSAPP_HML_TEMPLATE});
 }
 const fluxo=criarFluxoIsoladoHml({pool,segredo:env.AUTH_HML_SECRET,enviarCodigo,telefoneTeste:env.WHATSAPP_HML_DESTINO_TESTE});
 const seguro={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer',
  'Content-Security-Policy':"default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; base-uri 'none'; form-action 'self'; frame-ancestors 'none'"};
 async function limitar(chave,max=20){
  const r=await pool.query("INSERT INTO auth_admin_hml.limites(chave,quantidade,inicio) VALUES($1,1,now()) ON CONFLICT(chave) DO UPDATE SET quantidade=CASE WHEN limites.inicio<now()-interval '1 minute' THEN 1 ELSE limites.quantidade+1 END,inicio=CASE WHEN limites.inicio<now()-interval '1 minute' THEN now() ELSE limites.inicio END RETURNING quantidade",[chave]);
  if(r.rows[0].quantidade>max)throw Object.assign(Error('Muitas tentativas; aguarde um minuto'),{status:429});
 }
 const authPermitido=new Set(['GET /get-session','POST /sign-in/email','POST /sign-out','POST /two-factor/enable','POST /two-factor/verify-totp']);
 const autenticar=toNodeHandler(async request=>{
  const path=new URL(request.url).pathname.slice('/hml/auth'.length);
  if(!authPermitido.has(request.method+' '+path))return Response.json({erro:'Rota não disponível na homologação'},{status:404});
  if(request.method==='POST'){
   const reader=request.clone().body?.getReader();const partes=[];let tamanho=0;
   if(reader){while(true){const {value,done}=await reader.read();if(done)break;tamanho+=value.byteLength;if(tamanho>4096){void reader.cancel();return Response.json({erro:'Requisição grande'},{status:413});}partes.push(value);}}
   let dados;try{dados=JSON.parse(Buffer.concat(partes).toString());}catch{return Response.json({erro:'JSON inválido'},{status:400});}
   if(!dados||typeof dados!=='object'||Array.isArray(dados))return Response.json({erro:'JSON inválido'},{status:400});
   if(dados.trustDevice===true||dados.method==='otp')return Response.json({erro:'MFA TOTP obrigatório a cada login'},{status:400});
  }
  const resposta=await auth.handler(request);
  if(path==='/two-factor/verify-totp'&&resposta.ok){
   const headers=new Headers(request.headers);
   const cookies=new Map((headers.get('cookie')||'').split(';').filter(Boolean).map(x=>{const i=x.indexOf('=');return [x.slice(0,i).trim(),x.slice(i+1)];}));
   for(const cookie of resposta.headers.getSetCookie()){const first=cookie.split(';')[0],i=first.indexOf('=');cookies.set(first.slice(0,i),first.slice(i+1));}
   headers.set('cookie',[...cookies].map(([k,v])=>k+'='+v).join('; '));
   const s=await auth.api.getSession({headers});
   if(!s||s.user.email!==env.AUTH_HML_ADMIN_EMAIL||s.user.twoFactorEnabled!==true)return Response.json({erro:'MFA não vinculado à sessão'},{status:403});
   const c=await pool.connect();try{
    await c.query('BEGIN');
    await c.query('INSERT INTO auth_admin_hml.mfa_sessoes(sessao_id,usuario_id,confirmado_em) VALUES($1,$2,now()) ON CONFLICT(sessao_id) DO UPDATE SET confirmado_em=now()',[s.session.id,s.user.id]);
    await c.query("INSERT INTO auth_admin_hml.auditoria(evento,usuario_id) VALUES('mfa_totp_confirmado',$1)",[s.user.id]);
    await c.query('COMMIT');
   }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
  }
  // Os tokens de sessão permanecem em cookies HttpOnly; não são devolvidos ao JS.
  if(resposta.headers.get('content-type')?.includes('application/json')){
   const dados=await resposta.json();if(dados&&typeof dados==='object'){delete dados.token;if(dados.session)delete dados.session.token;}
   if(path==='/two-factor/enable'&&resposta.ok&&dados.totpURI){const {default:QRCode}=await import('qrcode');dados.qr=await QRCode.toDataURL(dados.totpURI);}
   const headers=new Headers(resposta.headers);headers.delete('content-length');return new Response(JSON.stringify(dados),{status:resposta.status,headers});
  }
  return resposta;
 });
 const json=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8',...seguro});res.end(JSON.stringify(data));};
 const corpo=async req=>{if(!/^application\/json(?:;|$)/i.test(req.headers['content-type']||''))throw Object.assign(Error('Envie JSON'),{status:415});const a=[];let n=0;for await(const b of req){n+=b.length;if(n>4096)throw Object.assign(Error('Requisição grande'),{status:413});a.push(b);}try{const d=JSON.parse(Buffer.concat(a).toString());if(!d||Array.isArray(d)||typeof d!=='object')throw Error();return d;}catch{throw Object.assign(Error('JSON inválido'),{status:400});}};
 async function handler(req,res){
  const path=req.url?.split('?')[0];if(!path||!(path===BASE||path.startsWith(BASE+'/')))return false;
  try{
   for(const [k,v]of Object.entries(seguro))res.setHeader(k,v);
   if(req.method!=='GET'&&(req.headers.origin!==HML_ORIGIN||req.headers['sec-fetch-site']==='cross-site'))return json(res,403,{erro:'Origem não autorizada'}),true;
   if(req.method==='POST')await limitar(path,path.includes('setup')?5:20);
   const assets={'/hml/':'hml-admin.html','/hml':'hml-admin.html','/hml/app.js':'hml-admin.js','/hml/style.css':'hml-admin.css'};
   if(req.method==='GET'&&assets[path]){const name=assets[path],content=await readFile(new URL('./'+name,import.meta.url));res.writeHead(200,{'Content-Type':name.endsWith('.html')?'text/html; charset=utf-8':name.endsWith('.js')?'application/javascript; charset=utf-8':'text/css; charset=utf-8',...seguro});res.end(content);return true;}
   if(path.startsWith('/hml/auth/')){await autenticar(req,res);return true;}
   if(path==='/hml/setup'&&req.method==='POST'){
    const d=await corpo(req);
    if(!segredoIgual(d.codigoInstalacao,env.AUTH_HML_BOOTSTRAP_TOKEN))return json(res,403,{erro:'Código de instalação inválido'}),true;
    const c=await pool.connect();try{
     await c.query('BEGIN');const r=await c.query('SELECT consumida FROM auth_admin_hml.instalacao WHERE id=1 FOR UPDATE');
     if(r.rows[0]?.consumida!==false)throw Object.assign(Error('Instalação já concluída'),{status:409});
     await auth.api.signUpEmail({body:{name:'Administrador Homologação',email:env.AUTH_HML_ADMIN_EMAIL,password:d.password}});
     await c.query('UPDATE auth_admin_hml.instalacao SET consumida=true WHERE id=1');
     await c.query("INSERT INTO auth_admin_hml.auditoria(evento) VALUES('administrador_isolado_criado')");await c.query('COMMIT');
    }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
    return json(res,200,{criado:true}),true;
   }
   if(path==='/hml/api/estado'&&req.method==='GET'){
    const s=await auth.api.getSession({headers:fromNodeHeaders(req.headers)});let mfaRecente=false;
    try{await exigirAdminMfa({auth,pool,headers:fromNodeHeaders(req.headers),adminEmail:env.AUTH_HML_ADMIN_EMAIL});mfaRecente=true;}catch{}
    const r=await pool.query('SELECT consumida FROM auth_admin_hml.instalacao WHERE id=1');
    return json(res,200,{ambiente:'homologacao',instalado:r.rows[0]?.consumida===true,autenticado:!!s,mfaAtivado:s?.user?.twoFactorEnabled===true,mfaRecente,whatsappConfigurado:fluxo.transporteDisponivel}),true;
   }
   if(path==='/hml/cidadao/confirmar'&&req.method==='POST'){return json(res,200,await fluxo.confirmar(await corpo(req))),true;}
   if(path==='/hml/cidadao/consultar'&&req.method==='POST'){return json(res,200,await fluxo.consultar(await corpo(req))),true;}
   const op=await exigirAdminMfa({auth,pool,headers:fromNodeHeaders(req.headers),adminEmail:env.AUTH_HML_ADMIN_EMAIL});
   if(path==='/hml/api/auditoria'&&req.method==='GET')return json(res,200,{eventos:await fluxo.auditoria()}),true;
   if(path==='/hml/api/pedidos'&&req.method==='POST')return json(res,200,await fluxo.criar(op)),true;
   const match=/^\/hml\/api\/pedidos\/([0-9a-f-]{36})\/(aprovar|iniciar|concluir)$/.exec(path);
   if(match&&req.method==='POST'){await corpo(req);return json(res,200,await fluxo[match[2]](match[1],op)),true;}
   json(res,404,{erro:'Rota não encontrada'});return true;
  }catch(e){if(!res.headersSent)json(res,e.status||503,{erro:e.status?e.message:'Operação indisponível'});else res.end();return true;}
 }
 return {handler,fechar:()=>pool.end(),auth,fluxo};
}
