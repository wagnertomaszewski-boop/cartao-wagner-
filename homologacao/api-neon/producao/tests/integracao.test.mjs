import {adaptarParaEdge} from '../edge-adaptador.mjs';
import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {generateKeyPairSync,sign} from 'node:crypto';
import {criarVerificadorContatoIndependente} from '../verificador-contato-independente.mjs';
import {criarEmissorExternoPorRecibo} from '../conferente-externo/emitir-atestado-por-recibo.mjs';
import {verificadorHmac} from '../../preproducao/segredos-privados.mjs';
import {criarStoragePrivado} from '../storage.mjs';
import {criarRepositorio} from '../repositorio.mjs';import {validarConfiguracaoPublica,validarConfiguracaoServidor} from '../configuracao.mjs';import {criarClienteWeb,criarContratoRecuperacaoCidadao,normalizarTelefoneRecuperacao} from '../web/cliente.mjs';import {criarHandlerProducao} from '../http.mjs';import http from 'node:http';
const segredoChaves='segredo-de-chaves-preexistente-ficticio-v1';
const uid='00000000-0000-4000-8000-000000000001',op={usuarioId:uid,mfaRecente:true};
async function ambiente({validarRegularizacaoContato=null}={}){const db=new PGlite();await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE mandato_api_privada;CREATE SCHEMA auth;CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;CREATE SEQUENCE public.protocolo_seq;
CREATE TABLE public.solicitacoes(id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,protocolo text DEFAULT '2026-'||lpad(nextval('protocolo_seq')::text,6,'0'),nome text NOT NULL,whatsapp text NOT NULL,localidade text NOT NULL,assunto text NOT NULL,descricao text NOT NULL,status text NOT NULL DEFAULT 'Recebida',anexos text[],latitude numeric,longitude numeric,criado_em timestamptz DEFAULT now(),atualizado_em timestamptz DEFAULT now(),anotacao_interna text);
CREATE TABLE public.solicitacoes_status_historico(id bigint GENERATED ALWAYS AS IDENTITY,solicitacao_id bigint REFERENCES public.solicitacoes(id),status text,criado_em timestamptz DEFAULT now());
CREATE TABLE public.respostas_solicitacoes(id bigint GENERATED ALWAYS AS IDENTITY,solicitacao_id bigint REFERENCES public.solicitacoes(id),mensagem text,anexos jsonb DEFAULT '[]',criado_em timestamptz DEFAULT now());
CREATE SCHEMA storage;CREATE TABLE storage.objects(bucket_id text);CREATE TABLE storage.buckets(id text PRIMARY KEY,public boolean);INSERT INTO storage.buckets VALUES('documentos-respostas',true),('conteudos-mandato',true);
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
GRANT USAGE ON SCHEMA storage,auth TO anon,authenticated;
GRANT SELECT ON storage.objects TO anon,authenticated;
INSERT INTO storage.objects VALUES ('documentos-respostas'),('conteudos-mandato');
CREATE POLICY conteudo_publico ON storage.objects FOR SELECT TO PUBLIC USING(bucket_id='conteudos-mandato');
CREATE POLICY "admin atualiza documentos de resposta" ON storage.objects FOR UPDATE TO authenticated USING(bucket_id='documentos-respostas' AND auth.uid()='${uid}'::uuid);
CREATE FUNCTION public.consulta_publica_protocolo(text) RETURNS text LANGUAGE sql SECURITY DEFINER AS $$ SELECT 'privado' $$;CREATE FUNCTION public.consulta_publica_historico_protocolo(text) RETURNS text LANGUAGE sql SECURITY DEFINER AS $$ SELECT 'privado' $$;CREATE FUNCTION public.consulta_publica_respostas_protocolo(text) RETURNS text LANGUAGE sql SECURITY DEFINER AS $$ SELECT 'privado' $$;
CREATE FUNCTION public.consultar_protocolo(text) RETURNS text LANGUAGE sql SECURITY DEFINER AS $$ SELECT 'privado' $$;
SET mandato.migracao_autorizada='sim';`);
await db.exec(await readFile(new URL('../../sql/rascunhos/20261115_estrutura_privada_recuperacao_producao.sql',import.meta.url),'utf8'));
await db.exec(await readFile(new URL('../sql/estrutura-candidata.sql',import.meta.url),'utf8'));
await db.exec(await readFile(new URL('../sql/contatos-legados-candidata.sql',import.meta.url),'utf8'));
const pool={query:(q,p)=>q.includes('pg_advisory_xact_lock')?Promise.resolve({rows:[]}):db.query(q,p),connect:async()=>({query:(q,p)=>q.includes('pg_advisory_xact_lock')?Promise.resolve({rows:[]}):db.query(q,p),release(){}})};
let tempo=Date.now();const objetos=new Map(),storage={enviar:async(p,b)=>objetos.set(p,Buffer.from(b)),baixar:async p=>objetos.get(p)};
const repo=criarRepositorio({pool,segredo:'segredo-sintetico-de-teste-independente-32',segredoChaves,storage,agora:()=>tempo,validarRegularizacaoContato});return {db,repo,avancar:ms=>{tempo+=ms;},objetos};}
const dados=(id='00000000-0000-4000-8000-000000000002')=>({operacaoId:id,p_nome:'Pessoa fictícia',p_whatsapp:'+5551999999999',p_localidade:'Local de teste',p_assunto:'Iluminação fictícia',p_descricao:'Ensaio isolado, sem cidadão real.',latitude:-31.004570880073523,longitude:-52.04360961914063,localizacaoOrigem:'mapa',localizacaoAutorizada:true});
test('solicitação antiga mantém protocolo e resposta, recebe chave por recuperação e anexo continua privado',async()=>{const a=await ambiente();try{await a.db.query("INSERT INTO public.solicitacoes(nome,whatsapp,localidade,assunto,descricao,status,protocolo) VALUES('Legado fictício','5551999999999','Teste','Histórico preservado','Descrição original','Em andamento','LEGADO/2025/2')");await a.db.query("INSERT INTO public.respostas_solicitacoes(solicitacao_id,mensagem,anexos) SELECT id,'Resposta antiga',$1 FROM public.solicitacoes WHERE protocolo='LEGADO/2025/2'",[JSON.stringify([{nome:'resposta.pdf',url:'https://pmmsdjozyyxkbuqlkfpb.supabase.co/storage/v1/object/public/documentos-respostas/legado/resposta.pdf'}])]);a.objetos.set('legado/resposta.pdf',Buffer.from('%PDF-TESTE'));const r=await a.repo.solicitarRecuperacao({protocolo:'LEGADO/2025/2',telefone:dados().p_whatsapp});await a.repo.decidir({pedidoId:r.pedidoId,decisao:'aprovar',justificativa:'Identidade fictícia conferida.',identidadeConferida:true},op);const e=await a.repo.emitir({pedidoId:r.pedidoId,telefoneConfirmado:dados().p_whatsapp},op),v=await a.repo.validarCodigo({...r,codigo:e.codigo}),consulta=await a.repo.consultar({protocolo:v.protocolo,chave:v.novaChave});assert.equal(consulta.status,'Em andamento');assert.equal(consulta.respostas[0].mensagem,'Resposta antiga');assert.equal(JSON.stringify(consulta).includes('/object/public/'),false);assert.equal(consulta.anexos.length,1);assert.equal((await a.repo.baixar({protocolo:v.protocolo,chave:v.novaChave,arquivoId:consulta.anexos[0].id})).base64,Buffer.from('%PDF-TESTE').toString('base64'));assert.equal((await a.db.query('SELECT count(*) AS n FROM public.solicitacoes')).rows[0].n,1);}finally{await a.db.close();}});
test('telefone legado em dez e doze digitos registra pedido mas impede envio WhatsApp sem destino movel confirmado',async()=>{
 for(const [armazenado,entrada,protocolo] of [
  ['5188887777','555188887777','LEGADO/2025/10'],
  ['555188887777','5188887777','LEGADO/2025/12']
 ]){
  const a=await ambiente();
  try{
   await a.db.query("INSERT INTO public.solicitacoes(nome,whatsapp,localidade,assunto,descricao,status,protocolo) VALUES('Pessoa ficticia',$1,'Local ficticio','Assunto sintetico','Somente teste','Recebida',$2)",[armazenado,protocolo]);
   assert.equal((await a.db.query('SELECT count(*) AS n FROM mandato_privado.chaves_acompanhamento')).rows[0].n,0);
   assert.equal((await a.repo.consultar({protocolo,chave:'chave-inexistente'})).encontrado,false);
   // Nao inferir o nono digito e nao permitir pedido para telefone nao correspondente.
   const neutro=await a.repo.solicitarRecuperacao({protocolo,telefone:'51988887777'});
   assert.ok(neutro.pedidoId && neutro.recibo);
   assert.equal((await a.db.query('SELECT count(*) AS n FROM mandato_privado.pedidos_recuperacao')).rows[0].n,0);
   const estrangeiro=await a.repo.solicitarRecuperacao({protocolo,telefone:'+1 212 555 0100'});
   assert.ok(estrangeiro.pedidoId && estrangeiro.recibo);
   assert.equal((await a.db.query('SELECT count(*) AS n FROM mandato_privado.pedidos_recuperacao')).rows[0].n,0);
   const pedido=await a.repo.solicitarRecuperacao({protocolo,telefone:entrada});
   assert.equal((await a.db.query('SELECT count(*) AS n FROM mandato_privado.pedidos_recuperacao')).rows[0].n,1);
   await assert.rejects(a.repo.decidir({pedidoId:pedido.pedidoId,decisao:'aprovar',identidadeConferida:true,justificativa:'Conferencia sintetica.'},{...op,mfaRecente:false}),e=>e.status===403);
   await a.repo.decidir({pedidoId:pedido.pedidoId,decisao:'aprovar',identidadeConferida:true,justificativa:'Conferencia manual sintetica.'},op);
   await assert.rejects(a.repo.emitir({pedidoId:pedido.pedidoId,telefoneConfirmado:entrada},op),e=>e.status===409&&/regulariza/i.test(e.message));
   assert.equal((await a.db.query('SELECT count(*) AS n FROM mandato_privado.codigos_recuperacao')).rows[0].n,0);
   assert.equal((await a.db.query('SELECT count(*) AS n FROM mandato_privado.chaves_acompanhamento')).rows[0].n,0);
   assert.equal((await a.db.query('SELECT estado FROM mandato_privado.pedidos_recuperacao')).rows[0].estado,'aprovado');
   assert.equal((await a.db.query('SELECT count(*) AS n FROM public.solicitacoes')).rows[0].n,1);
  }finally{await a.db.close();}
 }
});
test('regularizacao de contato legado exige MFA e evidência de servidor, sem alterar cadastro',async()=>{
 const instante=Date.now();
 let modoEvidencia='negada';
 const a=await ambiente({validarRegularizacaoContato:async ({pedidoId,solicitacaoId,operadorId,telefoneOriginal,telefoneNovo})=>({
   validado:modoEvidencia!=='negada',
   evidenciaId:'00000000-0000-4000-8000-000000000099',
   verificadoEm:new Date(modoEvidencia==='expirada'?instante-360000:instante).toISOString(),
   operadorId:modoEvidencia==='outro-operador'?'00000000-0000-4000-8000-000000000080':operadorId,
   pedidoId:modoEvidencia==='outro-pedido'?'00000000-0000-4000-8000-000000000088':pedidoId,
   solicitacaoId:modoEvidencia==='outra-solicitacao'?'12345':solicitacaoId,
   telefoneOriginal:modoEvidencia==='outro-original'?'+555188887770':telefoneOriginal,
   telefoneNovo:modoEvidencia==='outro-telefone'?'+5551999997788':telefoneNovo
 })});
 try{
  const protocolo='LEGADO/REGULARIZAR/2025',numeroOriginal='5188887777',novo='51999997777';
  await a.db.query("INSERT INTO public.solicitacoes(nome,whatsapp,localidade,assunto,descricao,status,protocolo) VALUES('Pessoa fictícia',$1,'Local fictício','Pedido antigo','Somente teste','Recebida',$2)",[numeroOriginal,protocolo]);
  const pedido=await a.repo.solicitarRecuperacao({protocolo,telefone:'(51) 8888-7777'});
  await a.repo.decidir({pedidoId:pedido.pedidoId,decisao:'aprovar',identidadeConferida:true,justificativa:'Identidade fictícia conferida manualmente.'},op);
  await assert.rejects(a.repo.emitir({pedidoId:pedido.pedidoId,telefoneConfirmado:'(51) 8888-7777'},op),e=>e.status===409&&e.codigo==='WHATSAPP_LEGADO_SEM_DESTINO');
  const regularizar={pedidoId:pedido.pedidoId,telefoneNovo:novo,telefoneConfirmado:novo,identidadeConferida:true,contatoVerificado:true,justificativa:'Contato atualizado com conferência manual no ensaio fictício.'};
  await assert.rejects(a.repo.regularizarContato(regularizar,{...op,mfaRecente:false}),e=>e.status===403);
  await assert.rejects(a.repo.regularizarContato({...regularizar,contatoVerificado:false},op),e=>e.status===403);
  await assert.rejects(a.repo.regularizarContato({...regularizar,telefoneConfirmado:'51999997778'},op),e=>e.status===400);
  for(const modo of ['negada','expirada','outro-operador','outro-telefone','outro-pedido','outra-solicitacao','outro-original']){
   modoEvidencia=modo;
   await assert.rejects(a.repo.regularizarContato(regularizar,op),e=>e.status===403&&/evidência/i.test(e.message));
   assert.equal((await a.db.query('SELECT count(*) AS n FROM mandato_privado.contatos_regularizados')).rows[0].n,0);
  }
  modoEvidencia='valida';
  const result=await a.repo.regularizarContato(regularizar,op);
  assert.equal(result.regularizado,true);
  assert.equal((await a.db.query('SELECT whatsapp FROM public.solicitacoes WHERE protocolo=$1',[protocolo])).rows[0].whatsapp,numeroOriginal);
  assert.equal((await a.db.query('SELECT count(*) AS n FROM mandato_privado.contatos_regularizados')).rows[0].n,1);
  assert.equal((await a.db.query('SELECT evidencia_id FROM mandato_privado.contatos_regularizados')).rows[0].evidencia_id,'00000000-0000-4000-8000-000000000099');
  assert.equal((await a.db.query("SELECT count(*) AS n FROM mandato_privado.auditoria_recuperacao WHERE evento='contato_legado_regularizado'")).rows[0].n,1);
  await assert.rejects(a.repo.emitir({pedidoId:pedido.pedidoId,telefoneConfirmado:'(51) 8888-7777'},op),e=>e.status===403);
  const emissao=await a.repo.emitir({pedidoId:pedido.pedidoId,telefoneConfirmado:novo},op);
  assert.equal(emissao.telefone,'+5551999997777');
  assert.match(emissao.codigo,/^\d{6}$/);
  const v=await a.repo.validarCodigo({...pedido,codigo:emissao.codigo});
  assert.equal(v.validado,true);
  assert.equal(v.protocolo,protocolo);
  assert.equal((await a.repo.consultar({protocolo,chave:v.novaChave})).encontrado,true);
  assert.equal((await a.repo.validarCodigo({...pedido,codigo:emissao.codigo})).validado,false);
  assert.equal((await a.db.query('SELECT whatsapp FROM public.solicitacoes WHERE protocolo=$1',[protocolo])).rows[0].whatsapp,numeroOriginal);
 }finally{await a.db.close();}
});
test('fluxo PostgreSQL com atestado assinado externo libera contato legado sem mudar número histórico',async()=>{
 const conferente=generateKeyPairSync('ed25519'),verificadorPosse=generateKeyPairSync('ed25519');
 const publicKey=conferente.publicKey;
 const conferenteId='00000000-0000-4000-8000-000000000013';
 const verificadorId='00000000-0000-4000-8000-000000000015';
 const evidenciaId='00000000-0000-4000-8000-000000000014';
 const instante=Date.now();let comprovante=null;
 const validar=criarVerificadorContatoIndependente({
  chavePublicaConferente:publicKey,conferentesPermitidos:[conferenteId],
  buscarAtestado:async()=>comprovante,relogio:()=>instante
 });
 const a=await ambiente({validarRegularizacaoContato:validar});
 try{
  const protocolo='LEGADO/SIGN/2025',numeroOriginal='5188887777';
  await a.db.query("INSERT INTO public.solicitacoes(nome,whatsapp,localidade,assunto,descricao,status,protocolo) VALUES('Pessoa sintética',$1,'Local sintético','Prova de telefone','Dados fictícios','Recebida',$2)",[numeroOriginal,protocolo]);
  const pedido=await a.repo.solicitarRecuperacao({protocolo,telefone:numeroOriginal});
  await a.repo.decidir({pedidoId:pedido.pedidoId,decisao:'aprovar',identidadeConferida:true,justificativa:'Identidade independente fictícia conferida.'},op);
  const entrada={pedidoId:pedido.pedidoId,telefoneNovo:'+5551999997777',
   telefoneConfirmado:'+5551999997777',identidadeConferida:true,contatoVerificado:true,
   justificativa:'Desafio de posse confirmado por fonte fictícia independente.'};
  await assert.rejects(a.repo.regularizarContato(entrada,op),e=>e.status===403);
  const solicitacaoId=(await a.db.query('SELECT id FROM public.solicitacoes WHERE protocolo=$1',[protocolo])).rows[0].id;
  const contexto={pedidoId:pedido.pedidoId,solicitacaoId:String(solicitacaoId),
   operadorId:uid,telefoneOriginal:'+555188887777',telefoneNovo:'+5551999997777'};
  const reciboDados={v:1,finalidade:'posse-independente-whatsapp',
   metodo:'desafio-confirmado-no-destino',evidenciaId,verificadorId,...contexto,
   confirmadoEm:new Date(instante-1000).toISOString()};
  const reciboBytes=Buffer.from(JSON.stringify(reciboDados));
  const recibo={payload:reciboBytes.toString('base64url'),assinatura:sign(null,
   Buffer.concat([Buffer.from('mandato-posse-contato-v1\0'),reciboBytes]),
   verificadorPosse.privateKey).toString('base64url')};
  const emissor=criarEmissorExternoPorRecibo({
   chavePrivadaConferente:conferente.privateKey,
   chavePublicaVerificador:verificadorPosse.publicKey,
   conferenteId,verificadoresPermitidos:[verificadorId],relogio:()=>instante
  });
  comprovante=emissor({recibo,contexto});
  assert.equal(typeof comprovante?.assinatura,'string');
  assert.equal((await a.repo.regularizarContato(entrada,op)).regularizado,true);
  assert.equal((await a.db.query('SELECT whatsapp FROM public.solicitacoes WHERE protocolo=$1',[protocolo])).rows[0].whatsapp,numeroOriginal);
  const emissao=await a.repo.emitir({pedidoId:pedido.pedidoId,telefoneConfirmado:'+5551999997777'},op);
  assert.equal(emissao.telefone,'+5551999997777');
  assert.equal((await a.repo.validarCodigo({...pedido,codigo:emissao.codigo})).validado,true);
  assert.equal((await a.repo.validarCodigo({...pedido,codigo:emissao.codigo})).validado,false);
  assert.equal((await a.db.query('SELECT count(*) AS n FROM mandato_privado.contatos_regularizados')).rows[0].n,1);
  // Mesmo um recibo validamente assinado não pode autorizar outra regularização
  // se reutilizar o identificador de evidência consumido na primeira.
  const segundo=await a.repo.solicitarRecuperacao({protocolo,telefone:numeroOriginal});
  await a.repo.decidir({pedidoId:segundo.pedidoId,decisao:'aprovar',
   identidadeConferida:true,justificativa:'Segunda identidade sintética conferida.'},op);
  const novoContexto={...contexto,pedidoId:segundo.pedidoId};
  const novoReciboDados={...reciboDados,pedidoId:segundo.pedidoId};
  const novoReciboBytes=Buffer.from(JSON.stringify(novoReciboDados));
  const novoRecibo={payload:novoReciboBytes.toString('base64url'),
   assinatura:sign(null,Buffer.concat([Buffer.from('mandato-posse-contato-v1\0'),novoReciboBytes]),
    verificadorPosse.privateKey).toString('base64url')};
  comprovante=emissor({recibo:novoRecibo,contexto:novoContexto});
  assert.equal(typeof comprovante?.assinatura,'string');
  await assert.rejects(a.repo.regularizarContato({...entrada,pedidoId:segundo.pedidoId},op),
   err=>err.code==='23505'||/duplicate key|unique/i.test(err.message));
  assert.equal((await a.db.query('SELECT count(*) AS n FROM mandato_privado.contatos_regularizados')).rows[0].n,1);
 }finally{await a.db.close();}
});
test('cliente da API candidata normaliza telefones historicos e bloqueia entradas invalidas',async()=>{
 const pares=[
  ['(51) 8888-7777','+555188887777'],
  ['+55 51 8888-7777','+555188887777'],
  ['(51) 98888-7777','+5551988887777'],
  ['+55 51 98888-7777','+5551988887777']
 ];
 for(const [entrada,esperado] of pares)assert.equal(normalizarTelefoneRecuperacao(entrada),esperado);
 for(const invalido of ['',null,'88887777','0000000000000','+1 212 555 0100'])assert.throws(()=>normalizarTelefoneRecuperacao(invalido));
 const chamadas=[],cfg={ambiente:'producao',projeto:'pmmsdjozyyxkbuqlkfpb',apiBase:'https://api.exemplo.org',versao:'a'.repeat(40)};
 const api=criarClienteWeb(cfg,async(url,opt)=>{chamadas.push({url,opt});return {ok:true,json:async()=>({pedidoId:'sintetico',recibo:'sintetico'})};});
 await api.solicitar({protocolo:'LEGADO/2025/10',telefone:'(51) 8888-7777'});
 assert.equal(chamadas.length,1);
 assert.equal(new URL(chamadas[0].url).search,'');
 assert.equal(chamadas[0].opt.credentials,'omit');
 assert.deepEqual(JSON.parse(chamadas[0].opt.body),{protocolo:'LEGADO/2025/10',telefone:'+555188887777'});
 assert.equal(chamadas[0].opt.headers.Authorization,undefined);
});
test('HTTP e cliente do painel sinalizam destino WhatsApp legado sem vazar para acesso publico',async()=>{
 let execucoes=0;
 const repositorio={
  limitarEntrada:async()=>true,
  emitir:async()=>{execucoes++;throw Object.assign(Error('Destino nao confirmado'),{status:409,codigo:'WHATSAPP_LEGADO_SEM_DESTINO'});}
 };
 const handler=criarHandlerProducao({
  repositorio,origemApi:'https://api.exemplo.org',
  resolverAdminMfa:async()=>({usuarioId:uid,mfaRecente:true})
 });
 const s=http.createServer(async(req,res)=>{if(!await handler(req,res)){res.writeHead(404);res.end();}});
 await new Promise(resolve=>s.listen(0,'127.0.0.1',resolve));
 try{
  const url='http://127.0.0.1:'+s.address().port+'/api/v1/admin/recuperacao/emitir';
  const fazer=token=>fetch(url,{method:'POST',headers:{Origin:'https://api.exemplo.org','Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify({pedidoId:'sintetico'})});
  const semToken=await fazer(null);assert.equal(semToken.status,401);assert.equal((await semToken.json()).codigo,undefined);assert.equal(execucoes,0);
  const comToken=await fazer('token-sintetico');assert.equal(comToken.status,409);
  const data=await comToken.json();assert.equal(data.codigo,'WHATSAPP_LEGADO_SEM_DESTINO');
  assert.match(data.erro,/regulariza/i);assert.equal(execucoes,1);
 }finally{await new Promise(resolve=>s.close(resolve));}
 const cfg={ambiente:'producao',projeto:'pmmsdjozyyxkbuqlkfpb',apiBase:'https://api.exemplo.org',versao:'a'.repeat(40)};
 const cliente=criarClienteWeb(cfg,async()=>new Response(JSON.stringify({codigo:'WHATSAPP_LEGADO_SEM_DESTINO',erro:'Contato antigo'}),{status:409,headers:{'Content-Type':'application/json'}}));
 await assert.rejects(cliente.admin('emitir',{pedidoId:'sintetico'},'token-sintetico'),/regularize o numero|regularize o número/i);
});
test('cadastro no formato produtivo preserva coordenadas, isola cidadãos e reflete status/histórico do Painel',async()=>{const a=await ambiente();try{const p=await a.repo.cadastrar(dados());const repetido=await a.repo.cadastrar(dados());assert.equal(p.protocolo,repetido.protocolo);assert.equal(p.chaveInicial,repetido.chaveInicial);assert.equal((await a.db.query('SELECT count(*) AS n FROM public.solicitacoes')).rows[0].n,1);
assert.equal((await a.repo.consultar({protocolo:p.protocolo})).encontrado,false);const outro=await a.repo.cadastrar(dados('00000000-0000-4000-8000-000000000003'));assert.equal((await a.repo.consultar({protocolo:outro.protocolo,chave:p.chaveInicial})).encontrado,false);
await a.db.query("UPDATE public.solicitacoes SET status='Em análise',anotacao_interna='NÃO EXPOR' WHERE protocolo=$1",[p.protocolo]);await a.db.query("INSERT INTO public.solicitacoes_status_historico(solicitacao_id,status) SELECT id,status FROM public.solicitacoes WHERE protocolo=$1",[p.protocolo]);const consulta=await a.repo.consultar({protocolo:p.protocolo,chave:p.chaveInicial});assert.equal(consulta.status,'Em análise');assert.equal(consulta.historico.length,1);assert.equal(JSON.stringify(consulta).includes('NÃO EXPOR'),false);assert.equal(Object.hasOwn(consulta,'latitude'),false);const coord=(await a.db.query('SELECT latitude::text,longitude::text,localizacao_origem FROM public.solicitacoes WHERE protocolo=$1',[p.protocolo])).rows[0];assert.equal(coord.latitude,String(dados().latitude));assert.equal(coord.longitude,String(dados().longitude));await assert.rejects(a.repo.cadastrar({...dados(),p_descricao:'alterada'}),e=>e.status===409);
}finally{await a.db.close();}});
test('fotos privadas múltiplas, deduplicação e bloqueio de arquivo de outro cidadão',async()=>{const a=await ambiente();try{const p=await a.repo.cadastrar(dados()),b=await a.repo.cadastrar(dados('00000000-0000-4000-8000-000000000003'));const png=Buffer.from([137,80,78,71,13,10,26,10,0]),d={protocolo:p.protocolo,chave:p.chaveInicial,nome:'teste.png',mime:'image/png',base64:png.toString('base64')};const f=await a.repo.anexar(d);assert.equal((await a.repo.anexar(d)).id,f.id);await a.repo.anexar({...d,nome:'segunda.png',base64:Buffer.concat([png,Buffer.from([1])]).toString('base64')});assert.equal(a.objetos.size,2);assert.equal((await a.repo.consultar(d)).anexos.length,2);assert.equal((await a.repo.baixar({...d,arquivoId:f.id})).base64,d.base64);await assert.rejects(a.repo.baixar({protocolo:b.protocolo,chave:b.chaveInicial,arquivoId:f.id}),e=>e.status===403);await assert.rejects(a.repo.baixar({protocolo:p.protocolo,arquivoId:f.id}),e=>e.status===403);}finally{await a.db.close();}});
test('recuperação exige MFA/destino, renova chave, rejeita reuso e expira aos cinco minutos com auditoria',async()=>{const a=await ambiente();try{const p=await a.repo.cadastrar(dados());const pedir=()=>a.repo.solicitarRecuperacao({protocolo:p.protocolo,telefone:dados().p_whatsapp});const r=await pedir();await assert.rejects(a.repo.decidir({pedidoId:r.pedidoId,decisao:'aprovar',identidadeConferida:true,justificativa:'Identidade sintética conferida.'},{...op,mfaRecente:false}),e=>e.status===403);
await a.repo.decidir({pedidoId:r.pedidoId,decisao:'aprovar',identidadeConferida:true,justificativa:'Identidade sintética conferida.'},op);await assert.rejects(a.repo.emitir({pedidoId:r.pedidoId,telefoneConfirmado:'+5551888888888'},op),e=>e.status===403);await a.db.query('UPDATE public.solicitacoes SET whatsapp=$1 WHERE protocolo=$2',['5551888888888',p.protocolo]);
await assert.rejects(a.repo.emitir({pedidoId:r.pedidoId,telefoneConfirmado:'+5551888888888'},op),{status:403});
await a.db.query('UPDATE public.solicitacoes SET whatsapp=$1 WHERE protocolo=$2',[dados().p_whatsapp,p.protocolo]);
const e=await a.repo.emitir({pedidoId:r.pedidoId,telefoneConfirmado:dados().p_whatsapp},op);assert.match(e.codigo,/^\d{6}$/);assert.equal((await a.repo.confirmarEnvio({pedidoId:r.pedidoId,envioConfirmado:true},op)).entregaComprovada,false);const v=await a.repo.validarCodigo({...r,codigo:e.codigo});assert.equal(v.validado,true);assert.equal((await a.repo.consultar({protocolo:p.protocolo,chave:p.chaveInicial})).encontrado,false);assert.equal((await a.repo.consultar({protocolo:p.protocolo,chave:v.novaChave})).encontrado,true);assert.equal((await a.repo.validarCodigo({...r,codigo:e.codigo})).validado,false);
const r2=await pedir();await a.repo.decidir({pedidoId:r2.pedidoId,decisao:'aprovar',identidadeConferida:true,justificativa:'Nova conferência sintética.'},op);const e2=await a.repo.emitir({pedidoId:r2.pedidoId,telefoneConfirmado:dados().p_whatsapp},op);a.avancar(300000);assert.equal((await a.repo.validarCodigo({...r2,codigo:e2.codigo})).validado,false);const eventos=(await a.db.query('SELECT evento FROM mandato_privado.auditoria_recuperacao')).rows.map(x=>x.evento);for(const x of ['recuperacao_aprovado','codigo_emitido','codigo_validado_chave_renovada','codigo_reutilizado','codigo_expirado'])assert.ok(eventos.includes(x));assert.equal((await a.db.query('SELECT count(*) AS n FROM mandato_privado.codigos_recuperacao k JOIN mandato_privado.pedidos_recuperacao p ON p.id=k.pedido_id WHERE k.usado_em IS NULL AND p.estado=\'aprovado\'')).rows[0].n,0);
}finally{await a.db.close();}});
test('rejeição não libera código e cinco erros bloqueiam sem registrar código puro',async()=>{const a=await ambiente();try{const p=await a.repo.cadastrar(dados()),r=await a.repo.solicitarRecuperacao({protocolo:p.protocolo,telefone:dados().p_whatsapp});await a.repo.decidir({pedidoId:r.pedidoId,decisao:'rejeitar',identidadeConferida:true,justificativa:'Não foi comprovada a identidade.'},op);await assert.rejects(a.repo.emitir({pedidoId:r.pedidoId,telefoneConfirmado:dados().p_whatsapp},op),e=>e.status===409);const r2=await a.repo.solicitarRecuperacao({protocolo:p.protocolo,telefone:dados().p_whatsapp});await a.repo.decidir({pedidoId:r2.pedidoId,decisao:'aprovar',identidadeConferida:true,justificativa:'Conferido.'},op);const e=await a.repo.emitir({pedidoId:r2.pedidoId,telefoneConfirmado:dados().p_whatsapp},op);for(let i=0;i<5;i++)assert.equal((await a.repo.validarCodigo({...r2,codigo:e.codigo==='000000'?'111111':'000000'})).validado,false);assert.equal((await a.repo.validarCodigo({...r2,codigo:e.codigo})).validado,false);assert.equal((await a.db.query('SELECT estado FROM mandato_privado.pedidos_recuperacao WHERE id=$1',[r2.pedidoId])).rows[0].estado,'expirado');}finally{await a.db.close();}});
test('contenção real de privilégios protege quatro RPCs e documentos, preservando conteúdo público e papel admin',async()=>{const a=await ambiente();try{const sql=await readFile(new URL('../sql/contencao-candidata.sql',import.meta.url),'utf8');await assert.rejects(a.db.exec(sql),/não autorizada/);await a.db.exec("ROLLBACK;SET mandato.backend_privado_validado='sim'");
 await a.db.exec('ALTER TABLE mandato_privado.chaves_acompanhamento RENAME COLUMN segredo_verificador TO chave_hash');
 await assert.rejects(a.db.exec(sql),/Contrato de consulta e recuperação privada incompatível/);
 await a.db.exec('ROLLBACK');
 assert.equal((await a.db.query("SELECT public FROM storage.buckets WHERE id='documentos-respostas'")).rows[0].public,true);
 assert.equal((await a.db.query("SELECT has_function_privilege('anon','public.consultar_protocolo(text)','EXECUTE') AS permitido")).rows[0].permitido,true);
 await a.db.exec('ALTER TABLE mandato_privado.chaves_acompanhamento RENAME COLUMN chave_hash TO segredo_verificador');
 await a.db.exec(sql);
 // Uma concessão ampla acidental não pode reabrir documentos de resposta.
 await a.db.exec('CREATE POLICY leitura_ampla ON storage.objects FOR SELECT TO PUBLIC USING (true)');
 for(const [role,sub,esperados] of [
  ['anon','',['conteudos-mandato']],
  ['authenticated','00000000-0000-4000-8000-000000000099',['conteudos-mandato']],
  ['authenticated',uid,['conteudos-mandato','documentos-respostas']]
 ]){
  await a.db.query("SELECT set_config('request.jwt.claim.sub',$1,false)",[sub]);
  await a.db.exec('SET ROLE '+role);
  assert.deepEqual((await a.db.query('SELECT bucket_id FROM storage.objects ORDER BY bucket_id')).rows.map(r=>r.bucket_id),esperados);
  await a.db.exec('RESET ROLE');
 }
 assert.equal((await a.db.query("SELECT count(*)::int n FROM storage.objects WHERE bucket_id='documentos-respostas'")).rows[0].n,1);
 for(const role of ['anon','authenticated'])for(const f of ['consulta_publica_protocolo','consulta_publica_historico_protocolo','consulta_publica_respostas_protocolo','consultar_protocolo']){assert.equal((await a.db.query('SELECT has_function_privilege($1,$2,\'EXECUTE\') AS permitido',[role,'public.'+f+'(text)'])).rows[0].permitido,false);}assert.equal((await a.db.query("SELECT public FROM storage.buckets WHERE id='documentos-respostas'")).rows[0].public,false);assert.equal((await a.db.query("SELECT public FROM storage.buckets WHERE id='conteudos-mandato'")).rows[0].public,true);assert.equal((await a.db.query("SELECT has_table_privilege('mandato_api_privada','mandato_privado.auditoria_recuperacao','UPDATE') AS permitido")).rows[0].permitido,false);}finally{await a.db.close();}});
test('configuração e cliente de produção não aceitam homologação, segredos ou protocolo isolado',async()=>{const c={ambiente:'producao',projeto:'pmmsdjozyyxkbuqlkfpb',apiBase:'https://api.exemplo.org',versao:'a'.repeat(40)};assert.throws(()=>validarConfiguracaoPublica({...c,apiBase:'https://mandato-neon-homologacao.onrender.com'}));assert.throws(()=>validarConfiguracaoPublica({...c,secret:'nao-publicar'}));assert.throws(()=>validarConfiguracaoServidor({}));let chamadas=0;const api=criarClienteWeb(c,async(url,o)=>{chamadas++;assert.equal(new URL(url).search,'');assert.equal(o.credentials,'omit');assert.equal(o.cache,'no-store');return {ok:true,json:async()=>({encontrado:false})};});assert.throws(()=>api.consultar({protocolo:'2026-000001'}));await api.consultar({protocolo:'2026-000001',chave:'a'.repeat(43)});assert.equal(chamadas,1);});
test('cliente browser e API candidata completam recuperacao de protocolo legado sem chave, com Edge e banco isolados',async()=>{
 const a=await ambiente();
 const protocolo='LEGADO/E2E/2025';
 const telefone='5551999997777',chaveFalsa=Buffer.alloc(32,3).toString('base64url');
 await a.db.query("INSERT INTO public.solicitacoes(nome,whatsapp,localidade,assunto,descricao,status,protocolo) VALUES('Cidadão fictício',$1,'Local fictício','Pedido antigo','Descrição fictícia','Em andamento',$2)",[telefone,protocolo]);
 await a.db.query("INSERT INTO public.solicitacoes_status_historico(solicitacao_id,status) SELECT id,'Em andamento' FROM public.solicitacoes WHERE protocolo=$1",[protocolo]);
 await a.db.query("INSERT INTO public.respostas_solicitacoes(solicitacao_id,mensagem) SELECT id,'Resposta fictícia preservada' FROM public.solicitacoes WHERE protocolo=$1",[protocolo]);
 const edge='https://pmmsdjozyyxkbuqlkfpb.supabase.co';
 const base=edge+'/functions/v1/mandato-privado';
 const handler=criarHandlerProducao({repositorio:a.repo,origemApi:edge,resolverAdminMfa:async token=>token==='admin-token-ficticio'?op:null});
 const responder=adaptarParaEdge(handler,{versao:'a'.repeat(40)});
 let requisicoes=0;
 try{
  const buscar=async(url,opt)=>{
   assert.ok(url.startsWith(base+'/api/v1/'));
   assert.equal(opt.credentials,'omit');assert.equal(opt.cache,'no-store');assert.equal(opt.redirect,'error');
   assert.equal(opt.method,'POST');requisicoes++;
   const destino=requisicoes%2===0?url.replace('/functions/v1/','/'):url;
   const r=await responder(new Request(destino,{...opt,headers:{...opt.headers,Origin:'https://wagnertomaszewski-boop.github.io'}}));
   assert.equal(r.headers.get('cache-control'),'no-store');
   return r;
  };
  const cfg={ambiente:'producao',projeto:'pmmsdjozyyxkbuqlkfpb',apiBase:base,versao:'a'.repeat(40)};
  const api=criarClienteWeb(cfg,buscar);
  const contrato=criarContratoRecuperacaoCidadao(api);
  assert.throws(()=>api.consultar({protocolo}),/protocolo e chave/i);
  const desconhecido=await contrato.consultar({protocolo,chave:chaveFalsa});
  assert.equal(desconhecido.encontrado,false);
  const pedido=await contrato.solicitar({protocolo,telefone:'(51) 99999-7777'});
  assert.match(pedido.pedidoId,/^[0-9a-f-]{36}$/);assert.match(pedido.recibo,/^[A-Za-z0-9_-]{43}$/);
  await assert.rejects(api.validarSessaoAdmin('sessao-sem-mfa'),/renove o MFA/);
  assert.deepEqual(await api.validarSessaoAdmin('admin-token-ficticio'),{autenticado:true,mfaRecente:true});
  await assert.rejects(api.admin('listar',{},'sessao-sem-mfa'),/renove o MFA/);
  const antes=await api.admin('listar',{},'admin-token-ficticio');
  assert.equal(antes.filter(x=>x.id===pedido.pedidoId).length,1);
  await api.admin('decidir',{pedidoId:pedido.pedidoId,decisao:'aprovar',identidadeConferida:true,justificativa:'Identidade conferida em teste fictício.'},'admin-token-ficticio');
  const emissao=await api.admin('emitir',{pedidoId:pedido.pedidoId,telefoneConfirmado:'+5551999997777'},'admin-token-ficticio');
  assert.match(emissao.codigo,/^\d{6}$/);
  assert.equal(emissao.telefone,'+5551999997777');
  assert.equal(emissao.envioPermitido,true);
  const confirmacao=await api.admin('confirmar-envio',{pedidoId:pedido.pedidoId,envioConfirmado:true},'admin-token-ficticio');
  assert.equal(confirmacao.entregaComprovada,false);
  const validado=await contrato.validar({...pedido,codigo:emissao.codigo});
  assert.equal(validado.confirmado,true);assert.equal(validado.protocolo,protocolo);
  assert.match(validado.novaChave,/^[A-Za-z0-9_-]{43}$/);
  const acompanhamento=await contrato.consultar({protocolo,chave:validado.novaChave});
  assert.equal(acompanhamento.encontrado,true);
  assert.equal(acompanhamento.status,'Em andamento');
  assert.equal(acompanhamento.localidade,'Local fictício');
  assert.equal(acompanhamento.historico.length,1);
  assert.ok(acompanhamento.historico[0].criadoEm);
  assert.equal(acompanhamento.respostas[0].mensagem,'Resposta fictícia preservada');
  assert.equal(JSON.stringify(acompanhamento).includes('Cidadão fictício'),false);
  assert.equal((await contrato.validar({...pedido,codigo:emissao.codigo})).confirmado,false);
  assert.equal((await a.db.query('SELECT count(*) AS n FROM public.solicitacoes')).rows[0].n,1);
  assert.equal((await a.db.query('SELECT count(*) AS n FROM mandato_privado.chaves_acompanhamento')).rows[0].n,1);
  assert.equal((await a.db.query("SELECT count(*) AS n FROM mandato_privado.auditoria_recuperacao WHERE evento='codigo_validado_chave_renovada'")).rows[0].n,1);
  assert.ok(requisicoes>=8);
 }finally{await a.db.close();}
});
test('rota administrativa de regularizacao exige autenticação e MFA recente',async()=>{
 const entradas=[];
 const repo={
  limitarEntrada:async()=>true,
  regularizarContato:async (dados,op)=>{entradas.push({dados,op});return {regularizado:true,destinoMascarado:'+55 ** *****7777'};}
 };
 const handler=criarHandlerProducao({repositorio:repo,origemApi:'https://api.exemplo.org',resolverAdminMfa:async token=>token==='autenticado'?{usuarioId:uid,mfaRecente:true}:{usuarioId:uid,mfaRecente:false}});
 const servidor=http.createServer(async(req,res)=>{if(!await handler(req,res)){res.writeHead(404);res.end();}});
 await new Promise(resolve=>servidor.listen(0,'127.0.0.1',resolve));
 try{
  const destino='http://127.0.0.1:'+servidor.address().port+'/api/v1/admin/recuperacao/regularizar-contato';
  const enviar=(token,origin='https://wagnertomaszewski-boop.github.io')=>fetch(destino,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify({pedidoId:'synthetic'})});
  assert.equal((await enviar(null)).status,401);
  assert.equal((await enviar('sem-mfa')).status,403);
  assert.equal((await enviar('autenticado','https://intruso.invalid')).status,403);
  assert.equal(entradas.length,0);
  const retorno=await enviar('autenticado');
  assert.equal(retorno.status,200);
  assert.equal((await retorno.json()).regularizado,true);
  assert.equal(entradas.length,1);
  assert.equal(entradas[0].op.usuarioId,uid);
  assert.equal(entradas[0].dados.pedidoId,'synthetic');
 }finally{await new Promise(resolve=>servidor.close(resolve));}
});
test('handler HTTP bloqueia origens, credenciais ausentes e MFA inválido antes de executar administrador',async()=>{let execucoes=0;const repo={limitarEntrada:async()=>true,decidir:async()=>{execucoes++;return {};}};const handler=criarHandlerProducao({repositorio:repo,resolverAdminMfa:async()=>({usuarioId:uid,mfaRecente:false}),origemApi:'https://api.exemplo.org'}),s=http.createServer(async(q,r)=>{if(!await handler(q,r)){r.writeHead(404);r.end();}});await new Promise(r=>s.listen(0,'127.0.0.1',r));try{const url='http://127.0.0.1:'+s.address().port+'/api/v1/admin/recuperacao/decidir';const req=(origin,token)=>fetch(url,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:'{}'});assert.equal((await req('https://intruso.invalid')).status,403);assert.equal((await req('https://wagnertomaszewski-boop.github.io')).status,401);assert.equal((await req('https://wagnertomaszewski-boop.github.io','sintetico')).status,403);assert.equal(execucoes,0);}finally{await new Promise(r=>s.close(r));}});

test('transporte de anexos usa a rota autenticada e recusa URLs públicas como entrada',async()=>{
 const chamadas=[];
 const chave='sb_secret_'+ 'sintetica_mandato'.repeat(2);
 const storage=criarStoragePrivado({chavesSecretas:JSON.stringify({default:'sb_secret_'+ 'sintetica_default'.repeat(2),mandato_api_privada:chave}),buscar:async(url,op)=>{
  chamadas.push({url,op});
  return new Response('%PDF-ficticio');
 }});
 const bytes=await storage.baixar('resposta/arquivo de teste.pdf','documentos-respostas');
 assert.equal(bytes.toString(),'%PDF-ficticio');
 const [{url,op}]=chamadas;
 assert.match(url,/\/storage\/v1\/object\/authenticated\/documentos-respostas\/resposta\/arquivo%20de%20teste\.pdf$/);
 assert.equal(op.headers.apikey,chave);
 assert.equal(op.headers.Authorization,undefined);
 assert.equal(op.redirect,'error');
 assert.equal(op.cache,'no-store');
 await assert.rejects(storage.baixar('https://example.invalid/storage/v1/object/public/documentos-respostas/a.pdf','documentos-respostas'),/Caminho privado inválido/);
 assert.equal(chamadas.length,1);
 await storage.enviar('privado/1/arquivo.pdf',Buffer.from('%PDF-ficticio'),'application/pdf');
 const upload=chamadas[1];
 assert.match(upload.url,/^https:\/\/pmmsdjozyyxkbuqlkfpb\.supabase\.co\/storage\/v1\/object\/anexos-solicitacoes\//);
 assert.equal(upload.op.method,'POST');
 assert.deepEqual(upload.op.headers,{apikey:chave,'Content-Type':'application/pdf','x-upsert':'false'});
 assert.equal(upload.op.redirect,'error');
});

test('Storage falha sem chave nomeada válida mesmo quando existe uma chave default',()=>{
 const defaultKey='sb_secret_'+ 'sintetica_default'.repeat(2);
 for(const chavesSecretas of [undefined,'{malformado',JSON.stringify({default:defaultKey}),
  JSON.stringify({default:defaultKey,mandato_api_privada:'jwt-legado-ficticio'}),
  JSON.stringify({mandato_api_privada:42})]){
  assert.throws(()=>criarStoragePrivado({chavesSecretas}),erro=>
   /SUPABASE_SECRET_KEYS|mandato_api_privada/.test(erro.message)&&!erro.message.includes(defaultKey));
 }
});

test('preserva chave HMAC v1 emitida pelo cadastro anterior e recusa versão desconhecida',async()=>{
 const a=await ambiente();
 try{
  const chave=Buffer.alloc(32,7).toString('base64url');
  const {rows:[solicitacao]}=await a.db.query(
   "INSERT INTO public.solicitacoes (nome,whatsapp,localidade,assunto,descricao) VALUES ('Fixture','5551999999999','Teste','Assunto','Descrição') RETURNING id,protocolo");
  await a.db.query('INSERT INTO mandato_privado.chaves_acompanhamento (solicitacao_id,segredo_verificador) VALUES ($1,$2)',
   [solicitacao.id,verificadorHmac('key',chave,segredoChaves)]);
  assert.equal((await a.repo.consultar({protocolo:solicitacao.protocolo,chave})).encontrado,true);
  assert.equal((await a.repo.consultar({protocolo:solicitacao.protocolo})).encontrado,false);
  await a.db.query('UPDATE mandato_privado.chaves_acompanhamento SET segredo_versao=2 WHERE solicitacao_id=$1',[solicitacao.id]);
  assert.equal((await a.repo.consultar({protocolo:solicitacao.protocolo,chave})).encontrado,false);
 }finally{await a.db.close();}
});

test('gatilho real de histórico não bloqueia cadastro por papel privado restrito',async()=>{
 const a=await ambiente();
 try{
  await a.db.exec("CREATE FUNCTION public.registrar_historico_status_solicitacao() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='public' AS $$ BEGIN IF tg_op='INSERT' THEN INSERT INTO public.solicitacoes_status_historico(solicitacao_id,status,criado_em) VALUES(new.id,coalesce(new.status,'Recebida'),coalesce(new.criado_em,now())); RETURN new; END IF; IF new.status IS DISTINCT FROM old.status THEN INSERT INTO public.solicitacoes_status_historico(solicitacao_id,status,criado_em) VALUES(new.id,coalesce(new.status,'Recebida'),now()); END IF; RETURN new; END $$;");
  await a.db.exec("CREATE TRIGGER trg_registrar_historico_status_solicitacao AFTER INSERT OR UPDATE OF status ON public.solicitacoes FOR EACH ROW EXECUTE FUNCTION public.registrar_historico_status_solicitacao();");
  await a.db.exec("ALTER TABLE public.solicitacoes ENABLE ROW LEVEL SECURITY;ALTER TABLE public.solicitacoes_status_historico ENABLE ROW LEVEL SECURITY;");
  await a.db.exec("SET ROLE mandato_api_privada;");
  const p=await a.repo.cadastrar(dados('00000000-0000-4000-8000-000000000011'));
  const consulta=await a.repo.consultar({protocolo:p.protocolo,chave:p.chaveInicial});
  assert.equal(consulta.encontrado,true);
  assert.deepEqual(consulta.historico.map(x=>x.status),['Encaminhado']);
  const pedido=await a.repo.solicitarRecuperacao({protocolo:p.protocolo,telefone:dados().p_whatsapp});
  await a.repo.decidir({pedidoId:pedido.pedidoId,decisao:'aprovar',identidadeConferida:true,justificativa:'Identidade fictícia conferida.'},op);
  const emissao=await a.repo.emitir({pedidoId:pedido.pedidoId,telefoneConfirmado:dados().p_whatsapp},op);
  assert.equal((await a.repo.validarCodigo({...pedido,codigo:emissao.codigo})).validado,true);
  const direitos=(await a.db.query("SELECT has_table_privilege(current_user,'mandato_privado.auditoria_recuperacao','UPDATE') AS altera_auditoria,has_table_privilege(current_user,'public.solicitacoes_status_historico','INSERT') AS altera_historico")).rows[0];
  assert.equal(direitos.altera_auditoria,false);
  assert.equal(direitos.altera_historico,false);
 }finally{await a.db.close();}
});

test('migração candidata pode ser reaplicada sem recriar políticas, tabelas ou perder registros sintéticos',async()=>{
 const a=await ambiente();
 try{
  const p=await a.repo.cadastrar(dados('00000000-0000-4000-8000-000000000019'));
  const antes=(await a.db.query('SELECT count(*) AS n FROM public.solicitacoes')).rows[0].n;
  const policiesBefore=(await a.db.query("SELECT count(*) AS n FROM pg_policies WHERE policyname IN ('backend_restrito','backend_privado_le','backend_privado_insere','backend_privado_anexos','backend_privado_historico','backend_privado_respostas')")).rows[0].n;
  const sql=await readFile(new URL('../sql/estrutura-candidata.sql',import.meta.url),'utf8');
  await a.db.exec(sql);
  const policiesAfter=(await a.db.query("SELECT count(*) AS n FROM pg_policies WHERE policyname IN ('backend_restrito','backend_privado_le','backend_privado_insere','backend_privado_anexos','backend_privado_historico','backend_privado_respostas')")).rows[0].n;
  assert.equal(policiesAfter,policiesBefore,'não duplica políticas');
  assert.equal((await a.db.query('SELECT count(*) AS n FROM public.solicitacoes')).rows[0].n,antes,'não altera pedidos');
  assert.equal((await a.repo.consultar({protocolo:p.protocolo,chave:p.chaveInicial})).encontrado,true);
 }finally{await a.db.close();}
});

test('migração candidata rejeita política homônima de outro papel e mantém a segurança',async()=>{
 const a=await ambiente();
 try{
  await a.db.exec('ALTER POLICY backend_privado_le ON public.solicitacoes TO anon;');
  const sql=await readFile(new URL('../sql/estrutura-candidata.sql',import.meta.url),'utf8');
  await assert.rejects(a.db.exec(sql),/Política pública preexistente incompatível/);
  await a.db.exec('ROLLBACK');
  assert.equal((await a.db.query("SELECT roles::text FROM pg_policies WHERE schemaname='public' AND tablename='solicitacoes' AND policyname='backend_privado_le'")).rows[0].roles,'{anon}');
  assert.equal((await a.db.query("SELECT count(*) AS n FROM mandato_privado.chaves_acompanhamento")).rows[0].n,0);
 }finally{await a.db.close();}
});

test('HTTP Edge rejeita código reutilizado, expirado e bloqueado por cinco tentativas e audita os eventos',async()=>{
 const a=await ambiente();
 const origem='https://pmmsdjozyyxkbuqlkfpb.supabase.co';
 const responder=adaptarParaEdge(criarHandlerProducao({
  repositorio:a.repo,origemApi:origem,resolverAdminMfa:async token=>token==='admin-sintetico'?op:null
 }),{versao:'a'.repeat(40)});
 async function post(rota,payload,administrador=false){
  const resposta=await responder(new Request(origem+'/functions/v1/mandato-privado/api/v1/'+rota,{
   method:'POST',headers:{'Content-Type':'application/json',...(administrador?{Authorization:'Bearer admin-sintetico'}:{})},
   body:JSON.stringify(payload)
  }));
  const corpo=await resposta.json();
  assert.equal(resposta.status,200,JSON.stringify(corpo));
  return corpo;
 }
 try{
  const cadastro=await post('solicitacoes/cadastrar',dados());
  async function emitir(){
   const recibo=await post('recuperacao/solicitar',{protocolo:cadastro.protocolo,telefone:dados().p_whatsapp});
   await post('admin/recuperacao/decidir',{pedidoId:recibo.pedidoId,decisao:'aprovar',identidadeConferida:true,justificativa:'Conferência fictícia.'},true);
   const {codigo}=await post('admin/recuperacao/emitir',{pedidoId:recibo.pedidoId,telefoneConfirmado:dados().p_whatsapp},true);
   return {...recibo,codigo};
  }
  const usado=await emitir();
  const renovado=await post('recuperacao/validar',usado);
  assert.equal(renovado.validado,true);
  assert.deepEqual(await post('recuperacao/validar',usado),{validado:false});
  assert.deepEqual(await post('solicitacoes/consultar',{protocolo:cadastro.protocolo,chave:cadastro.chaveInicial}),{encontrado:false});
  assert.equal((await post('solicitacoes/consultar',{protocolo:cadastro.protocolo,chave:renovado.novaChave})).encontrado,true);
  const expirado=await emitir();
  a.avancar(300000);
  assert.deepEqual(await post('recuperacao/validar',expirado),{validado:false});
  const bloqueado=await emitir();
  const errado=bloqueado.codigo==='000000'?'111111':'000000';
  for(let tentativa=0;tentativa<5;tentativa++)
   assert.deepEqual(await post('recuperacao/validar',{...bloqueado,codigo:errado}),{validado:false});
  assert.deepEqual(await post('recuperacao/validar',bloqueado),{validado:false});
  const {rows:eventos}=await a.db.query('SELECT evento,count(*)::int AS total FROM mandato_privado.auditoria_recuperacao GROUP BY evento');
  const contagem=Object.fromEntries(eventos.map(({evento,total})=>[evento,total]));
  assert.equal(contagem.codigo_validado_chave_renovada,1);
  assert.equal(contagem.codigo_reutilizado,1);
  assert.equal(contagem.codigo_expirado,1);
  assert.equal(contagem.codigo_incorreto,5);
 }finally{await a.db.close();}
});

test('retomada web entre domínios mantém recibo em cookie particionado e rejeita outra origem',async()=>{
 const a=await ambiente();
 const edge='https://pmmsdjozyyxkbuqlkfpb.supabase.co';
 const origem='https://wagnertomaszewski-boop.github.io';
 const base=edge+'/functions/v1/mandato-privado/api/v1/';
 const resposta=adaptarParaEdge(criarHandlerProducao({repositorio:a.repo,origemApi:edge,reciboWeb:true,
  resolverAdminMfa:async token=>token==='admin-sintetico'?op:null}),{versao:'a'.repeat(40)});
 const request=(rota,d,extra={})=>resposta(new Request(base+rota,{method:'POST',
  headers:{Origin:origem,'Content-Type':'application/json',...extra},body:JSON.stringify(d)}));
 try{
  const p=await (await request('solicitacoes/cadastrar',dados())).json();
  const rota='recuperacao/navegador/';
  const options=await resposta(new Request(base+rota+'solicitar',{method:'OPTIONS',headers:{Origin:origem}}));
  assert.equal(options.status,204);
  assert.equal(options.headers.get('access-control-allow-credentials'),'true');
  assert.equal((await request(rota+'solicitar',{}, {Origin:'https://outro.example'})).status,403);
  const inicio=await request(rota+'solicitar',{protocolo:p.protocolo,telefone:dados().p_whatsapp});
  assert.deepEqual(await inicio.json(),{recebido:true});
  assert.equal(inicio.headers.get('access-control-allow-origin'),origem);
  const cookie=inicio.headers.get('set-cookie');
  assert.match(cookie,/Path=\/functions\/v1\/mandato-privado\/api\/v1\/recuperacao\/navegador; Max-Age=86400; HttpOnly; Secure; SameSite=None; Partitioned$/);
  const credencial=cookie.split(';')[0];
  const admin={Authorization:'Bearer admin-sintetico'};
  const [{id}]=await (await request('admin/recuperacao/listar',{},admin)).json();
  await request('admin/recuperacao/decidir',{pedidoId:id,decisao:'aprovar',identidadeConferida:true,justificativa:'Conferência fictícia.'},admin);
  const {codigo}=await (await request('admin/recuperacao/emitir',{pedidoId:id,telefoneConfirmado:dados().p_whatsapp},admin)).json();
  const cliente=criarClienteWeb({ambiente:'producao',projeto:'pmmsdjozyyxkbuqlkfpb',apiBase:edge+'/functions/v1/mandato-privado'},(url,opts)=>{
   assert.equal(opts.credentials,'include');
   return resposta(new Request(url,{...opts,headers:{...opts.headers,Origin:origem,Cookie:credencial}}));
  });
  assert.deepEqual(await (await request(rota+'validar',{codigo})).json(),{validado:false,reciboAusente:true});
  const nova=await cliente.validarNavegador(codigo);
  assert.equal(nova.validado,true);
  assert.equal(nova.protocolo,p.protocolo);
  assert.deepEqual(await cliente.validarNavegador(codigo),{validado:false});
  assert.deepEqual(await (await request('solicitacoes/consultar',{protocolo:p.protocolo,chave:p.chaveInicial})).json(),{encontrado:false});
 }finally{await a.db.close();}
});
