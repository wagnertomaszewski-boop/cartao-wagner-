import {readFile} from 'node:fs/promises';
import {toNodeHandler,fromNodeHeaders} from 'better-auth/node';
import {criarAuthAdminHml,validarConfigAuthHml,segredoIgual,exigirAdminMfa,HML_ORIGIN} from './auth-admin-hml.mjs';
import {criarFluxoIsoladoHml} from './fluxo-isolado-hml.mjs';
import {criarRecuperacaoManualHml} from './recuperacao-manual-hml.mjs';
import {criarCadastroModeloHml} from './solicitacoes-modelo-hml.mjs';
import {criarGestaoSolicitacoesHml} from './gestao-solicitacoes-hml.mjs';
import {criarConteudosHml} from './conteudos-publicos-hml.mjs';
import {createHash} from 'node:crypto';
import {criarArquivosHml} from './arquivos-privados-hml.mjs';
import {criarConteudoArquivosHml} from './conteudo-arquivos-hml.mjs';
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
 const fluxo=criarFluxoIsoladoHml({pool,segredo:env.AUTH_HML_SECRET});
 const midiaConteudo=criarConteudoArquivosHml({pool});
 const arquivos=criarArquivosHml({pool,segredo:env.AUTH_HML_SECRET});
 const conteudos=criarConteudosHml({pool});
 const gestao=criarGestaoSolicitacoesHml({pool,segredo:env.AUTH_HML_SECRET});
 const cadastro=criarCadastroModeloHml({pool,segredo:env.AUTH_HML_SECRET});
 const manual=criarRecuperacaoManualHml({pool,segredo:env.AUTH_HML_SECRET,telefoneTeste:env.WHATSAPP_HML_DESTINO_TESTE});
 if(env.HML_AUTOTESTE_MANUAL==='sim'){
  const {autotestarRecuperacaoManual,autotestarDestinoPessoal,autotestarConcorrenciaEntrePedidos}=await import('./autoteste-manual-hml.mjs');
  const teste=criarRecuperacaoManualHml({pool,segredo:env.AUTH_HML_SECRET});
  await autotestarRecuperacaoManual({manual:teste,fluxo,pool});
  await autotestarDestinoPessoal({manual:teste,pool});
  await autotestarConcorrenciaEntrePedidos({manual:teste,pool});
  const {autotestarModeloReal,autotestarFormatosLegados}=await import('./autoteste-modelo-hml.mjs');
  await autotestarModeloReal({cadastro,manual:teste,fluxo,pool});
  await autotestarFormatosLegados({cadastro,manual:teste,fluxo,pool});
  const {autotestarEcossistema}=await import('./autoteste-ecossistema-hml.mjs');
  await autotestarEcossistema({pool,cadastro,fluxo,gestao,arquivos,conteudos});
  const {autotestarMidiaConteudo}=await import('./autoteste-midia-hml.mjs');
  await autotestarMidiaConteudo({pool,conteudos,midiaConteudo});
  console.log('AUTOTESTE_ECOSSISTEMA_NEON_OK: atendimento, anexo privado, resposta, fiscalização e conteúdo publicado fictício; sem mensagens externas.');
  console.log('AUTOTESTE_MODELO_REAL_NEON_OK: cadastro, isolamento por chave, recuperação legada e histórico preservado; nenhum envio externo.');
  console.log('AUTOTESTE_MANUAL_NEON_OK: fixture fictícia; consumo concorrente único; chave substituída; auditoria; nenhum WhatsApp enviado.');
 }
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
 const corpo=async (req,max=4096)=>{if(!/^application\/json(?:;|$)/i.test(req.headers['content-type']||''))throw Object.assign(Error('Envie JSON'),{status:415});const a=[];let n=0;for await(const b of req){n+=b.length;if(n>max)throw Object.assign(Error('Requisição grande'),{status:413});a.push(b);}try{const d=JSON.parse(Buffer.concat(a).toString());if(!d||Array.isArray(d)||typeof d!=='object')throw Error();return d;}catch{throw Object.assign(Error('JSON inválido'),{status:400});}};
 async function handler(req,res){
  const path=req.url?.split('?')[0];if(!path||!(path===BASE||path.startsWith(BASE+'/')))return false;
  try{
   for(const [k,v]of Object.entries(seguro))res.setHeader(k,v);
   if(req.method!=='GET'&&(req.headers.origin!==HML_ORIGIN||req.headers['sec-fetch-site']==='cross-site'))return json(res,403,{erro:'Origem não autorizada'}),true;
   if(req.method==='POST')await limitar(path,path.includes('setup')?5:20);
   const telasAntigas={'/hml/v2/solicitacao.html':'/hml/v2/solicitar','/hml/v2/acompanhar.html':'/hml/v2/recuperar','/hml/index.html':'/hml/v2/index.html','/hml/recuperar':'/hml/v2/recuperar','/hml/painel-recuperacao':'/hml/painel/recuperacoes'};
   if(req.method==='GET'&&telasAntigas[path]){res.writeHead(302,{Location:telasAntigas[path],...seguro});res.end();return true;}
   const assets={'/hml/login-fluxo.mjs':'hml-login-fluxo.mjs','/hml/v2/seguranca/biometria-cidadao.mjs':'telas/v2/seguranca/biometria-cidadao.mjs','/hml/v2/conteudos/arquivos-publicos-hml.mjs':'telas/v2/conteudos/arquivos-publicos-hml.mjs','/hml/painel/seguranca/relatorio-solicitacoes.mjs':'telas/painel/seguranca/relatorio-solicitacoes.mjs','/hml/v2/index.html':'telas/v2/index.html','/hml/v2/agenda.html':'telas/v2/noticias.html','/hml/v2/projetos.html':'telas/v2/projetos.html','/hml/v2/styles.css':'telas/v2/styles.css','/hml/v2/conteudos/contrato-projetos.mjs':'telas/v2/conteudos/contrato-projetos.mjs','/hml/v2/noticias.html':'telas/v2/noticias.html','/hml/v2/conteudos/tela-noticias.mjs':'telas/v2/conteudos/tela-noticias.mjs','/hml/painel/conteudos':'telas/painel/conteudos.html','/hml/painel/seguranca/conteudos.mjs':'telas/painel/seguranca/conteudos.mjs','/hml/mandato/solicitar':'telas/v2/solicitar-homologacao.html','/hml/v2/solicitar':'telas/v2/solicitar-homologacao.html','/hml/v2/seguranca/tela-cadastro-hml.mjs':'telas/v2/seguranca/tela-cadastro-hml.mjs','/hml/':'hml-admin.html','/hml':'hml-admin.html','/hml/app.js':'hml-admin.js','/hml/style.css':'hml-admin.css','/hml/recuperar':'hml-recuperar.html','/hml/painel-recuperacao':'hml-painel-recuperacao.html','/hml/recuperacao.js':'hml-recuperacao.js','/hml/teste-whatsapp':'hml-teste-whatsapp.html','/hml/teste-whatsapp.js':'hml-teste-whatsapp.js','/hml/v2/recuperar':'telas/v2/recuperar-acesso.html','/hml/v2/recuperar-acesso.html':'telas/v2/recuperar-acesso.html','/hml/v2/recuperacao.css':'telas/v2/recuperacao.css','/hml/v2/seguranca/cliente-recuperacao-manual.mjs':'telas/v2/seguranca/cliente-recuperacao-manual.mjs','/hml/v2/seguranca/tela-recuperacao-manual.mjs':'telas/v2/seguranca/tela-recuperacao-manual.mjs','/hml/painel/recuperacoes':'telas/painel/recuperacoes.html','/hml/painel/recuperacoes.html':'telas/painel/recuperacoes.html','/hml/painel/seguranca/recuperacoes.mjs':'telas/painel/seguranca/recuperacoes.mjs'};
   if(req.method==='GET'&&assets[path]){const name=assets[path],content=await readFile(new URL('./'+name,import.meta.url));let extras={};if(['telas/v2/projetos.html','telas/v2/index.html'].includes(name)){const html=content.toString(),sha=x=>"'sha256-"+createHash('sha256').update(x).digest('base64')+"'",dec=x=>x.replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&amp;/g,'&');const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(x=>sha(x[1]));const eventos=[...html.matchAll(/\bon[a-z]+="([^"]*)"/g)].map(x=>sha(dec(x[1])));const estilos=[...html.matchAll(/<style(?:\s[^>]*)?>([\s\S]*?)<\/style>/g)].map(x=>sha(x[1])).concat([...html.matchAll(/\bstyle="([^"]*)"/g)].map(x=>sha(dec(x[1]))));extras={'Content-Security-Policy':seguro['Content-Security-Policy'].replace("script-src 'self'","script-src 'self' 'unsafe-hashes' "+[...new Set([...scripts,...eventos,sha("go('projetos')")])].join(' ')).replace("style-src 'self'","style-src 'self' 'unsafe-hashes' "+[...new Set(estilos)].join(' '))};}res.writeHead(200,{'Content-Type':name.endsWith('.html')?'text/html; charset=utf-8':(name.endsWith('.js')||name.endsWith('.mjs'))?'application/javascript; charset=utf-8':'text/css; charset=utf-8',...seguro,...extras});res.end(content);return true;}
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
    const prova=await pool.query("SELECT EXISTS(SELECT 1 FROM auth_admin_hml.auditoria WHERE evento='manual_autoteste_v1_concluido') AS ok, EXISTS(SELECT 1 FROM auth_admin_hml.auditoria WHERE evento='manual_autoteste_v2_destino_concluido') AS destino_ok, EXISTS(SELECT 1 FROM auth_admin_hml.auditoria WHERE evento='manual_autoteste_v3_telas_concluido') AS telas_ok, EXISTS(SELECT 1 FROM auth_admin_hml.auditoria WHERE evento='modelo_autoteste_integrado_concluido') AND EXISTS(SELECT 1 FROM auth_admin_hml.auditoria WHERE evento='modelo_autoteste_formatos_concluido') AS modelo_ok, EXISTS(SELECT 1 FROM auth_admin_hml.auditoria WHERE evento='ecossistema_autoteste_v1_concluido') AS ecossistema_ok");
    return json(res,200,{ecossistemaValidado:prova.rows[0]?.ecossistema_ok===true,modeloRealValidado:prova.rows[0]?.modelo_ok===true,versaoRecuperacaoManual:3,manualTelasValidadas:prova.rows[0]?.telas_ok===true,manualDestinoValidado:prova.rows[0]?.destino_ok===true,manualNeonValidado:prova.rows[0]?.ok===true,ambiente:'homologacao',instalado:r.rows[0]?.consumida===true,autenticado:!!s,mfaAtivado:s?.user?.twoFactorEnabled===true,mfaRecente,whatsappConfigurado:false,envioManual:true}),true;
   }
   const arquivoPublico=/^\/hml\/publico\/conteudo\/arquivo\/([0-9a-f-]{36})$/.exec(path);
   if(arquivoPublico&&req.method==='GET'){const f=await midiaConteudo.obter(arquivoPublico[1],false);if(!f)return json(res,404,{erro:'Arquivo não disponível'}),true;res.writeHead(200,{...seguro,'Content-Type':f.mime,'Content-Disposition':f.mime==='application/pdf'?"attachment; filename=arquivo.pdf; filename*=UTF-8''"+encodeURIComponent(f.nome).replace(/'/g,'%27'):'inline'});res.end(f.bytes);return true;}
   if(path==='/hml/publico/conteudos'&&req.method==='GET')return json(res,200,await conteudos.listar(false,new URL(req.url,HML_ORIGIN).searchParams.get('tipo'))),true;
   if(path==='/hml/publico/projetos'&&req.method==='POST'){const d=await corpo(req);const lista=await conteudos.listar(false,d.p_tipo||null);return json(res,200,lista.filter(x=>!['noticia','agenda'].includes(x.tipo))),true;}
   if(path==='/hml/publico/projeto'&&req.method==='POST')return json(res,200,await conteudos.detalhe((await corpo(req)).p_id)),true;
   if(path==='/hml/cidadao/confirmar-leitura'&&req.method==='POST')return json(res,200,await gestao.confirmarLeitura(await corpo(req))),true;
   if(path==='/hml/cidadao/arquivo/anexar'&&req.method==='POST')return json(res,200,await arquivos.anexar(await corpo(req,1500000))),true;
   if(path==='/hml/cidadao/arquivo/baixar'&&req.method==='POST')return json(res,200,await arquivos.baixar(await corpo(req))),true;
   if(path==='/hml/cidadao/qr'&&req.method==='POST'){const d=await corpo(req);if(!(await fluxo.consultar(d)).encontrado)return json(res,200,{encontrado:false}),true;const destino=HML_ORIGIN+'/hml/v2/recuperar#protocolo='+encodeURIComponent(d.protocolo);const {default:QRCode}=await import('qrcode');return json(res,200,{encontrado:true,exigeChave:true,destino,qr:await QRCode.toDataURL(destino)}),true;}
   if(path==='/hml/cidadao/cadastrar'&&req.method==='POST')return json(res,200,await cadastro.cadastrar(await corpo(req))),true;
   if(path==='/hml/cidadao/confirmar'&&req.method==='POST'){return json(res,200,await fluxo.confirmar(await corpo(req))),true;}
   if(path==='/hml/cidadao/consultar'&&req.method==='POST'){return json(res,200,await fluxo.consultar(await corpo(req))),true;}
   if(path==='/hml/manual/solicitar'&&req.method==='POST')return json(res,200,await manual.solicitar(await corpo(req))),true;
   if(path==='/hml/manual/validar'&&req.method==='POST')return json(res,200,await manual.validar(await corpo(req))),true;
   const op=await exigirAdminMfa({auth,pool,headers:fromNodeHeaders(req.headers),adminEmail:env.AUTH_HML_ADMIN_EMAIL});
   if(path==='/hml/modelo/arquivo/anexar'&&req.method==='POST')return json(res,200,await arquivos.anexar(await corpo(req,1500000),op)),true;
   if(path==='/hml/modelo/arquivo/baixar'&&req.method==='POST')return json(res,200,await arquivos.baixar(await corpo(req),op)),true;
   if(path==='/hml/conteudos/arquivo'&&req.method==='POST')return json(res,200,await midiaConteudo.anexar(op,await corpo(req,1500000))),true;
   const arquivoEditor=/^\/hml\/conteudos\/arquivo\/([0-9a-f-]{36})$/.exec(path);
   if(arquivoEditor&&req.method==='GET'){const f=await midiaConteudo.obter(arquivoEditor[1],true);if(!f)return json(res,404,{erro:'Arquivo não disponível'}),true;res.writeHead(200,{...seguro,'Content-Type':f.mime,'Content-Disposition':f.mime==='application/pdf'?'attachment; filename=arquivo.pdf':'inline'});res.end(f.bytes);return true;}
   if(path==='/hml/conteudos'&&req.method==='GET')return json(res,200,await conteudos.listar(true)),true;
   if(path==='/hml/conteudos'&&req.method==='POST')return json(res,200,await conteudos.salvar(op,await corpo(req))),true;
   if(path==='/hml/modelo/dashboard'&&req.method==='GET')return json(res,200,await gestao.dashboard()),true;
   const gestaoMatch=/^\/hml\/modelo\/solicitacoes\/([0-9a-f-]{36})\/(atualizar|responder|fiscalizar|acompanhar|auditoria|aviso)$/.exec(path);
   if(gestaoMatch){if(req.method==='GET'&&gestaoMatch[2]==='auditoria')return json(res,200,await gestao.auditoria(gestaoMatch[1])),true;if(req.method==='POST'&&gestaoMatch[2]!=='auditoria')return json(res,200,await gestao[gestaoMatch[2]](gestaoMatch[1],op,await corpo(req))),true;}
   if(path==='/hml/modelo/solicitacoes'&&['GET','POST'].includes(req.method))return json(res,200,await cadastro.listar(req.method==='POST'?await corpo(req):{})),true;
   if(path==='/hml/modelo/importar-legado-ficticio'&&req.method==='POST')return json(res,200,await cadastro.importarLegadoFicticio(op,await corpo(req))),true;
   if(path==='/hml/modelo/legado'&&req.method==='POST')return json(res,200,await cadastro.importarFixture(await corpo(req))),true;
   if(path==='/hml/manual/pedidos'&&req.method==='GET')return json(res,200,await manual.listar()),true;
   if(path==='/hml/manual/fixture-pessoal'&&req.method==='POST'){const p=await manual.criarFixture(op,{...await corpo(req),testePessoal:true});return json(res,200,{id:p.id,protocolo:p.protocolo,telefoneMascarado:p.telefone.slice(0,5)+'*****'+p.telefone.slice(-4),ficticio:true}),true;}
   if(path==='/hml/manual/fixture'&&req.method==='POST'){await corpo(req);return json(res,200,await manual.criarFixture(op)),true;}
   const auditMatch=/^\/hml\/manual\/pedidos\/([0-9a-f-]{36})\/auditoria$/.exec(path);
   if(auditMatch&&req.method==='GET')return json(res,200,await manual.auditar(auditMatch[1])),true;
   const manualMatch=/^\/hml\/manual\/pedidos\/([0-9a-f-]{36})\/(decidir|emitir|abrir)$/.exec(path);
   if(manualMatch&&req.method==='POST'){const d=await corpo(req);const acao=manualMatch[2]==='abrir'?'registrarAbertura':manualMatch[2];return json(res,200,await manual[acao](manualMatch[1],op,d)),true;}
   if(path==='/hml/api/auditoria'&&req.method==='GET')return json(res,200,{eventos:await fluxo.auditoria()}),true;
   if(path==='/hml/api/pedidos'&&req.method==='POST')return json(res,200,await fluxo.criar(op)),true;
   const match=/^\/hml\/api\/pedidos\/([0-9a-f-]{36})\/(aprovar|iniciar|concluir)$/.exec(path);
   if(match&&req.method==='POST'){await corpo(req);return json(res,200,await fluxo[match[2]](match[1],op)),true;}
   json(res,404,{erro:'Rota não encontrada'});return true;
  }catch(e){if(!res.headersSent)json(res,e.status||503,{erro:e.status?e.message:'Operação indisponível'});else res.end();return true;}
 }
 return {handler,fechar:()=>pool.end(),auth,fluxo,manual,cadastro};
}
