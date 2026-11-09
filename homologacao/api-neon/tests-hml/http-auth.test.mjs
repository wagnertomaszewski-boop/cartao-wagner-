import {criarClienteRecuperacaoManual} from '../../../v2/seguranca/cliente-recuperacao-manual.mjs';
import test from 'node:test';import assert from 'node:assert/strict';import http from 'node:http';
import {randomBytes,randomUUID} from 'node:crypto';import {readFile} from 'node:fs/promises';import {PGlite} from '@electric-sql/pglite';
import {createOTP} from '@better-auth/utils/otp';import {base32} from '@better-auth/utils/base32';
import {montar} from '../servidor-auth-hml.mjs';import {HML_ORIGIN} from '../auth-admin-hml.mjs';
test('HTTP com Postgres: login, cadastro TOTP, prova de sessão, aprovação auditada, CSRF, rotas restritas e logout',async()=>{
 const pg=new PGlite();await pg.exec(await readFile(new URL('../sql/auth-admin-hml.sql',import.meta.url),'utf8'));await pg.exec('CREATE ROLE mandato_auth_hml');await pg.exec(await readFile(new URL('../sql/recuperacao-manual-hml.sql',import.meta.url),'utf8'));await pg.exec(await readFile(new URL('../sql/solicitacoes-modelo-hml.sql',import.meta.url),'utf8'));for(const f of ['conteudos-hml.sql','arquivos-hml.sql'])await pg.exec(await readFile(new URL('../sql/'+f,import.meta.url),'utf8'));await pg.exec('SET search_path=auth_admin_hml');
 async function query(sql,params){try{const r=await pg.query(sql,params);return {...r,rowCount:r.affectedRows,command:sql.trim().split(' ')[0].toUpperCase()};}catch(e){throw e;}}
 const pool={query,connect:async()=>({query,release(){}}),end:async()=>{}};
 const env={AUTH_HML_ADMIN_EMAIL:'admin-http@example.invalid',AUTH_HML_SECRET:randomBytes(48).toString('hex'),AUTH_HML_BOOTSTRAP_TOKEN:randomBytes(48).toString('hex')};
 const hml=await montar({env,pool});const password=randomBytes(24).toString('hex');
 await hml.auth.api.signUpEmail({body:{email:env.AUTH_HML_ADMIN_EMAIL,name:'Operador fictício',password}});
 const server=http.createServer(async(req,res)=>{if(!await hml.handler(req,res)){res.writeHead(404);res.end();}});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const jar=new Map(),url='http://127.0.0.1:'+server.address().port;
 async function call(path,data,origin=HML_ORIGIN){const r=await fetch(url+'/hml'+path,{method:data===undefined?'GET':'POST',headers:{Origin:origin,'Content-Type':'application/json',cookie:[...jar].map(([k,v])=>k+'='+v).join('; ')},body:data===undefined?undefined:JSON.stringify(data)});for(const c of r.headers.getSetCookie()){const a=c.split(';')[0],i=a.indexOf('=');jar.set(a.slice(0,i),a.slice(i+1));}return {status:r.status,headers:r.headers,data:await r.json()};}
 try{
  assert.equal((await call('/manual/pedidos')).status,401);
  assert.equal((await call('/conteudos',{})).status,401);assert.equal((await call('/modelo/dashboard')).status,401);assert.deepEqual((await call('/publico/conteudos')).data,[]);

  assert.equal((await call('/modelo/solicitacoes')).status,401);assert.equal((await call('/modelo/legado',{cenario:'legado'})).status,401);
  assert.equal((await call('/manual/fixture',{})).status,401);
  assert.equal((await call('/manual/fixture-pessoal',{telefone:'+5551999999999',confirmacaoTelefone:'+5551999999999',autorizoMeuNumero:true})).status,401);
  assert.equal((await call('/api/pedidos',{})).status,401);
  assert.equal((await call('/auth/get-session')).data,null);
  assert.equal((await call('/auth/sign-up/email',{email:'intruso@example.invalid',password,name:'Intruso'})).status,404);
  assert.equal((await call('/auth/sign-in/email',{email:env.AUTH_HML_ADMIN_EMAIL,password},'https://site-nao-autorizado.invalid')).status,403);
  let r=await call('/auth/sign-in/email',{email:env.AUTH_HML_ADMIN_EMAIL,password});assert.equal(r.status,200);assert.equal('token' in r.data,false);
  assert.equal((await call('/api/pedidos',{})).status,401);
  r=await call('/auth/two-factor/enable',{password});assert.equal(r.status,200);assert.match(r.data.qr,/^data:image\/png;base64,/);
  const secret=base32.decode(new URL(r.data.totpURI).searchParams.get('secret'));const code=await createOTP(secret,{digits:6,period:30}).totp();
  r=await call('/auth/two-factor/verify-totp',{code,trustDevice:false});assert.equal(r.status,200);assert.equal('token' in r.data,false);
  assert.equal((await call('/api/estado')).data.mfaRecente,true);
  const novoCadastro={ficticio:true,origem:'mandato',p_nome:'Pessoa fictícia',p_whatsapp:'+5551000000000',p_localidade:'Teste',p_assunto:'Teste de integração',p_descricao:'Descrição fictícia.'};
  const novo=(await call('/cidadao/cadastrar',novoCadastro)).data;
  assert.match(novo.chaveInicial,/^[A-Za-z0-9_-]{43}$/);
  assert.equal((await call('/cidadao/consultar',{protocolo:novo.protocolo})).data.encontrado,false);
  assert.equal((await call('/cidadao/consultar',{protocolo:novo.protocolo,chave:novo.chaveInicial})).data.status,'Recebida');
  assert.equal((await call('/cidadao/cadastrar',novoCadastro,'https://origem-invalida.example')).status,403);
  assert.equal((await call('/modelo/solicitacoes')).data.solicitacoes.length,1);
  const qr=(await call('/cidadao/qr',{protocolo:novo.protocolo,chave:novo.chaveInicial})).data;assert.equal(qr.exigeChave,true);assert.ok(!qr.destino.includes(novo.chaveInicial));assert.match(qr.qr,/^data:image\/png;base64,/);assert.equal(new URL(qr.destino).search,'');assert.ok(new URL(qr.destino).hash.includes(encodeURIComponent(novo.protocolo)));assert.equal((await call('/cidadao/qr',{protocolo:novo.protocolo})).data.encontrado,false);
  assert.equal((await call('/cidadao/confirmar-leitura',{protocolo:novo.protocolo,chave:novo.chaveInicial})).data.confirmaEntregaWhatsApp,false);
  const publicado=(await call('/conteudos',{tipo:'projeto',titulo:'Projeto fictício HTTP',resumo:'Resumo suficiente para publicar somente em homologação.',objetivo:'Detalhe completo publicado pela equipe.',publicado:true,operacaoId:randomUUID()})).data;
  assert.equal((await call('/publico/projeto',{p_id:publicado.id})).data.objetivo,'Detalhe completo publicado pela equipe.');
  assert.equal((await call('/modelo/solicitacoes/'+novo.id+'/atualizar',{status:'Em análise',justificativa:'Solicitação fictícia recebida para análise.',responsavel:'Equipe fictícia',revisao:0,operacaoId:randomUUID()})).status,200);
  assert.equal((await call('/cidadao/consultar',{protocolo:novo.protocolo,chave:novo.chaveInicial})).data.status,'Em análise');
  const pagina=await fetch(url+'/hml/v2/index.html');assert.equal(pagina.status,200);assert.match(pagina.headers.get('content-security-policy'),/sha256-/);assert.ok(!pagina.headers.get('content-security-policy').includes('unsafe-inline'));

  const legado=(await call('/modelo/legado',{cenario:'legado'})).data;assert.equal(legado.chaveInicial,null);

  const p=(await call('/api/pedidos',{})).data;assert.ok(p.id);assert.equal((await call('/api/pedidos/'+p.id+'/aprovar',{})).data.aprovado,true);
  assert.equal((await call('/api/pedidos/'+p.id+'/iniciar',{})).status,503);
  assert.ok((await call('/api/auditoria')).data.eventos.some(e=>e.evento==='aprovacao_auditada'));
  const fixture=(await call('/manual/fixture',{})).data;
  const pedido=(await call('/manual/solicitar',{protocolo:fixture.protocolo,telefone:fixture.telefone})).data;
  assert.ok(pedido.recibo);assert.equal((await call('/manual/pedidos')).data.pedidos.length,1);
  const base='/manual/pedidos/'+pedido.pedidoId;
  const conferir={identidadeConferida:true,telefoneConfirmado:fixture.telefone,justificativa:'Conferência independente de identidade fictícia.',decisao:'aprovar'};
  assert.equal((await call(base+'/emitir',conferir)).status,403);
  assert.equal((await call(base+'/decidir',{...conferir,identidadeConferida:false})).status,403);
  assert.equal((await call(base+'/decidir',conferir)).status,200);
  let emitido=await call(base+'/emitir',conferir);assert.equal(emitido.status,200);assert.equal(emitido.headers.get('cache-control'),'no-store');assert.equal(emitido.data.entregaConfirmada,false);
  assert.equal((await call(base+'/abrir',{...conferir,desafioId:emitido.data.desafioId})).status,403); // telefone fictício sem autorização para abrir WhatsApp
  assert.equal((await call('/manual/validar',{...pedido,codigo:emitido.data.codigo},'https://site-nao-autorizado.invalid')).status,403);
  const final=(await call('/manual/validar',{...pedido,codigo:emitido.data.codigo})).data;assert.equal(final.confirmado,true);assert.ok(final.novaChave);
  assert.equal((await call('/manual/validar',{...pedido,codigo:emitido.data.codigo})).data.confirmado,false);
  assert.equal((await call('/cidadao/consultar',{protocolo:fixture.protocolo,chave:fixture.chaveInicial})).data.encontrado,false);
  assert.equal((await call('/cidadao/consultar',{protocolo:fixture.protocolo,chave:final.novaChave})).data.encontrado,true);
  assert.equal((await call('/cidadao/consultar',{protocolo:fixture.protocolo})).data.encontrado,false);
  assert.equal((await call('/manual/fixture-pessoal',{})).status,400);
  // Mesmo cliente usado nas telas definitivas, contra HTTP + autenticação TOTP reais.
  const cliente=criarClienteRecuperacaoManual({origem:HML_ORIGIN,buscar:(endpoint,opcoes)=>fetch(url+new URL(endpoint).pathname,{...opcoes,headers:{...opcoes.headers,Origin:HML_ORIGIN,...(opcoes.credentials==='same-origin'?{cookie:[...jar].map(([k,v])=>k+'='+v).join('; ')}:{})}})});
  const fp=(await call('/manual/fixture',{})).data;
  const rp=await cliente.solicitar({protocolo:fp.protocolo,telefone:fp.telefone});
  const cf={identidadeConferida:true,telefoneConfirmado:fp.telefone,justificativa:'Identidade fictícia conferida para o teste do cliente definitivo.',decisao:'aprovar'};
  await cliente.decidir(rp.pedidoId,cf);const ec=await cliente.emitir(rp.pedidoId,cf);
  const vc=await cliente.validar({...rp,codigo:ec.codigo});assert.equal(vc.confirmado,true);assert.equal((await cliente.validar({...rp,codigo:ec.codigo})).confirmado,false);
  assert.equal((await cliente.consultar({protocolo:fp.protocolo,chave:vc.novaChave})).encontrado,true);
  assert.equal((await cliente.consultar({protocolo:fp.protocolo,chave:fp.chaveInicial})).encontrado,false);
  assert.ok((await cliente.auditoria(rp.pedidoId)).eventos.some(e=>e.evento==='manual_codigo_reuso_bloqueado'));
  const pessoal=await call('/manual/fixture-pessoal',{telefone:'+5551999999999',confirmacaoTelefone:'+5551999999999',autorizoMeuNumero:true});assert.equal(pessoal.status,200);assert.equal(pessoal.data.ficticio,true);assert.equal('telefone' in pessoal.data,false);assert.equal('chaveInicial' in pessoal.data,false);assert.ok(pessoal.data.telefoneMascarado.includes('*****'));assert.equal(pessoal.headers.get('cache-control'),'no-store');
  await pool.query("UPDATE auth_admin_hml.mfa_sessoes SET confirmado_em=now()-interval '6 minutes'");
  assert.equal((await call('/manual/fixture-pessoal',{telefone:'+5551999999999',confirmacaoTelefone:'+5551999999999',autorizoMeuNumero:true})).status,403);
  assert.equal((await call('/manual/pedidos/'+rp.pedidoId+'/auditoria')).status,403);
  assert.equal((await call('/conteudos',{})).status,403);
  assert.equal((await call('/modelo/solicitacoes')).status,403);assert.equal((await call('/modelo/legado',{cenario:'legado'})).status,403);
  assert.equal((await call(base+'/decidir',conferir)).status,403);assert.equal((await call(base+'/emitir',conferir)).status,403);
  await call('/auth/sign-out',{});assert.equal((await call('/api/pedidos',{})).status,401);
  r=await call('/auth/sign-in/email',{email:env.AUTH_HML_ADMIN_EMAIL,password});assert.equal(r.data.twoFactorRedirect,true);
  assert.equal((await call('/api/pedidos',{})).status,401);
  r=await call('/auth/two-factor/verify-totp',{code:await createOTP(secret,{digits:6,period:30}).totp(),trustDevice:false});assert.equal(r.status,200);
  assert.equal((await call('/api/estado')).data.mfaRecente,true);


 }finally{await new Promise(r=>server.close(r));await pg.close();}
});
