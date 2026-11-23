// Adaptador ao esquema real existente. Nenhuma cópia de registros para outro banco.
import {createHmac,createHash,randomUUID,randomBytes,randomInt,timingSafeEqual} from 'node:crypto';
import {verificadorHmac,verificarSegredoServidor} from '../preproducao/segredos-privados.mjs';
import {hashChavePrivada} from '../chaves-privadas.mjs';
import {validarArquivoBinario} from '../validacao-arquivo-hml.mjs';
import {anexosLegados} from './anexos-legados.mjs';
const falha=(status,m)=>Object.assign(Error(m),{status});
const uuid=x=>typeof x==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(x);
// Normaliza os números históricos sem acrescentar um nono dígito por suposição.
// Oito ou nove dígitos locais, sempre com DDD; opcional prefixo brasileiro 55.
// A coincidência do telefone nunca substitui MFA e conferência humana na recuperação.
const telefone=x=>{const bruto=String(x||'').trim();if(bruto.startsWith('+')&&!bruto.startsWith('+55'))throw falha(400,'Telefone inválido.');let s=bruto.replace(/\D/g,'');if(s.length===10||s.length===11)s='55'+s;if(!/^55[1-9]\d{9,10}$/.test(s))throw falha(400,'Telefone inválido.');return s;};
const texto=(x,max)=>{if(typeof x!=='string'||!x.trim()||x.length>max)throw falha(400,'Dados inválidos.');return x.trim();};
export function criarRepositorio({pool,segredo,segredoChaves,storage,agora=()=>Date.now(),validarRegularizacaoContato=null}){
 if(!pool||typeof segredo!=='string'||segredo.length<32)throw Error('Backend privado não configurado.');
 verificarSegredoServidor(segredoChaves);
 const verificarChave=chave=>hashChavePrivada(chave)?verificadorHmac('key',chave,segredoChaves):null;
 const h=(contexto,v)=>createHmac('sha256',segredo).update(contexto+'\0'+v).digest();
 async function tx(fn){const c=await pool.connect();try{await c.query('BEGIN');const v=await fn(c);await c.query('COMMIT');return v;}catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}}
 const auditar=(c,evento,id=null,op=null,rec=null)=>c.query('INSERT INTO mandato_privado.auditoria_recuperacao(evento,solicitacao_id,operador_id,pedido_id) VALUES($1,$2,$3,$4)',[evento,id,op,rec]);
 async function limitar(c,contexto,valor,max,ms){const r=await c.query(`INSERT INTO mandato_privado.limites(chave,quantidade,inicio) VALUES($1,1,$2) ON CONFLICT(chave) DO UPDATE SET quantidade=CASE WHEN limites.inicio<$3 THEN 1 ELSE limites.quantidade+1 END,inicio=CASE WHEN limites.inicio<$3 THEN $2 ELSE limites.inicio END RETURNING quantidade`,[h(contexto,valor),new Date(agora()),new Date(agora()-ms)]);return r.rows[0].quantidade<=max;}
 async function autorizado(c,d){const hash=verificarChave(d.chave);if(!hash||typeof d.protocolo!=='string'||d.protocolo.length>80)return null;const r=await c.query('SELECT s.* FROM public.solicitacoes s JOIN mandato_privado.chaves_acompanhamento a ON a.solicitacao_id=s.id WHERE s.protocolo=$1 AND a.segredo_verificador=$2 AND a.revogada_em IS NULL AND a.segredo_versao=1',[d.protocolo,hash]);return r.rows.length===1?r.rows[0]:null;}
 async function arquivoVinculado(c,s,d){const r=await c.query('SELECT * FROM mandato_privado.arquivos WHERE id=$1 AND solicitacao_id=$2',[d.arquivoId,s.id]);return r.rows[0];}
 return {
 async limitarEntrada(referencia){return limitar(pool,'entrada',referencia,40,60000);},
 async cadastrar(d){
  if(!uuid(d.operacaoId)||Object.hasOwn(d,'ficticio')||Object.hasOwn(d,'protocolo')||Object.hasOwn(d,'chave'))throw falha(400,'Cadastro inválido.');
  const campos=[texto(d.p_nome,120),telefone(d.p_whatsapp),texto(d.p_localidade,160),texto(d.p_assunto,160),texto(d.p_descricao,10000)];
  let lat=null,lng=null,origem=null,precisao=null;
  if(d.latitude!=null||d.longitude!=null){if(d.localizacaoAutorizada!==true||!['gps','mapa'].includes(d.localizacaoOrigem)||typeof d.latitude!=='number'||typeof d.longitude!=='number'||!Number.isFinite(d.latitude)||!Number.isFinite(d.longitude)||Math.abs(d.latitude)>90||Math.abs(d.longitude)>180)throw falha(400,'Localização inválida.');lat=d.latitude;lng=d.longitude;origem=d.localizacaoOrigem;if(origem==='gps'&&Number.isFinite(d.precisaoMetros)&&d.precisaoMetros>=0)precisao=d.precisaoMetros;}
  const op=h('operacao',d.operacaoId),chave=h('chave-cadastro',d.operacaoId).toString('base64url'),hash=verificarChave(chave),dadosHash=createHash('sha256').update(JSON.stringify([...campos,lat,lng,origem,precisao])).digest();
  const resultado=await tx(async c=>{
   // Serializa repetições da mesma operação antes de criar o registro original.
   await c.query('SELECT pg_advisory_xact_lock($1)',[op.readBigInt64BE(0).toString()]);
   const anterior=(await c.query('SELECT o.*,s.protocolo,a.segredo_verificador,a.segredo_versao,a.revogada_em FROM mandato_privado.operacoes o JOIN public.solicitacoes s ON s.id=o.solicitacao_id JOIN mandato_privado.chaves_acompanhamento a ON a.solicitacao_id=s.id WHERE o.id=$1',[op])).rows[0];
   if(anterior){if(!Buffer.from(anterior.dados_hash).equals(dadosHash)||anterior.revogada_em||anterior.segredo_versao!==1||!Buffer.from(anterior.segredo_verificador).equals(hash))throw falha(409,'Envio já processado ou alterado.');return {protocolo:anterior.protocolo,chaveInicial:chave,repetido:true};}
   if(!await limitar(c,'cadastro-telefone',campos[1],5,3600000))return {erro:429};
   const s=(await c.query(`INSERT INTO public.solicitacoes(nome,whatsapp,localidade,assunto,descricao,status,latitude,longitude,localizacao_origem,precisao_metros,localizacao_autorizada_em) VALUES($1,$2,$3,$4,$5,'Encaminhado',$6,$7,$8,$9,$10) RETURNING id,protocolo`,[...campos,lat,lng,origem,precisao,origem?new Date(agora()):null])).rows[0];
   if(!s.protocolo||(await c.query('SELECT id FROM public.solicitacoes WHERE protocolo=$1',[s.protocolo])).rows.length!==1)throw falha(409,'Protocolo indisponível; nenhuma solicitação criada.');
   await c.query('INSERT INTO mandato_privado.chaves_acompanhamento(solicitacao_id,segredo_verificador) VALUES($1,$2)',[s.id,hash]);
   await c.query('INSERT INTO mandato_privado.operacoes(id,solicitacao_id,dados_hash) VALUES($1,$2,$3)',[op,s.id,dadosHash]);
   await auditar(c,'cadastro_chave_emitida',s.id);return {protocolo:s.protocolo,chaveInicial:chave};
  });if(resultado.erro)throw falha(429,'Aguarde para enviar outra solicitação.');return resultado;
 },
 async consultar(d){return tx(async c=>{const s=await autorizado(c,d);if(!s){await auditar(c,'consulta_nao_autorizada');return {encontrado:false};}
  const historico=(await c.query('SELECT status,criado_em FROM public.solicitacoes_status_historico WHERE solicitacao_id=$1 ORDER BY criado_em,id',[s.id])).rows;
  const respostas=(await c.query('SELECT mensagem,criado_em,anexos FROM public.respostas_solicitacoes WHERE solicitacao_id=$1 ORDER BY criado_em,id',[s.id])).rows;
  const anexos=(await c.query('SELECT id,nome,mime,caminho FROM mandato_privado.arquivos WHERE solicitacao_id=$1 ORDER BY criado_em,id',[s.id])).rows;
  await auditar(c,'consulta_privada_validada',s.id);
  const legados=anexosLegados(s,respostas,segredo).filter(l=>!anexos.some(a=>a.caminho===l.caminho&&l.bucket==='anexos-solicitacoes'));
  return {encontrado:true,protocolo:s.protocolo,assunto:s.assunto,descricao:s.descricao,localidade:s.localidade,status:s.status,criadoEm:s.criado_em,atualizadoEm:s.atualizado_em,historico,respostas:respostas.map(({mensagem,criado_em})=>({mensagem,criado_em})),anexos:[...anexos.map(({id,nome,mime})=>({id,nome,mime})),...legados.map(({id,nome,mime})=>({id,nome,mime}))]};
 });},
 async anexar(d){if(!storage)throw falha(503,'Armazenamento privado indisponível.');const f=validarArquivoBinario(d);return tx(async c=>{
  const s=await autorizado(c,d);if(!s)throw falha(403,'Acesso privado inválido.');await c.query('SELECT id FROM public.solicitacoes WHERE id=$1 FOR UPDATE',[s.id]);
  const anterior=(await c.query('SELECT id,nome,mime FROM mandato_privado.arquivos WHERE solicitacao_id=$1 AND sha256=$2',[s.id,f.sha256])).rows[0];if(anterior)return {...anterior,repetido:true};
  if(Number((await c.query('SELECT count(*) AS n FROM mandato_privado.arquivos WHERE solicitacao_id=$1',[s.id])).rows[0].n)>=20)throw falha(429,'Limite de anexos atingido.');
  const id=randomUUID(),caminho='privado/'+s.id+'/'+id+(d.mime==='application/pdf'?'.pdf':d.mime==='image/png'?'.png':'.jpg');
  // Falha SQL após upload pode deixar objeto órfão privado; nunca apagar anexos reais.
  await storage.enviar(caminho,f.bytes,d.mime);
  await c.query('INSERT INTO mandato_privado.arquivos(id,solicitacao_id,nome,mime,caminho,sha256) VALUES($1,$2,$3,$4,$5,$6)',[id,s.id,f.nome,d.mime,caminho,f.sha256]);
  await c.query("UPDATE public.solicitacoes SET anexos=array_append(coalesce(anexos,ARRAY[]::text[]),$2) WHERE id=$1",[s.id,caminho]);await auditar(c,'arquivo_privado_anexado',s.id);return {id,nome:f.nome,mime:d.mime};
 });},
 async baixar(d){if(!uuid(d.arquivoId))throw falha(403,'Arquivo privado inválido.');const f=await tx(async c=>{const s=await autorizado(c,d);if(!s)throw falha(403,'Acesso privado inválido.');const a=await arquivoVinculado(c,s,d);if(a)return a;const respostas=(await c.query('SELECT anexos FROM public.respostas_solicitacoes WHERE solicitacao_id=$1',[s.id])).rows;const legado=anexosLegados(s,respostas,segredo).find(x=>x.id===d.arquivoId);if(!legado)throw falha(403,'Arquivo privado inválido.');return legado;});if(!storage)throw falha(503,'Armazenamento indisponível.');const bytes=await storage.baixar(f.caminho,f.bucket||'anexos-solicitacoes');return {nome:f.nome,mime:f.mime,base64:bytes.toString('base64')};},
 async solicitarRecuperacao(d){const recibo=randomBytes(32).toString('base64url'),id=randomUUID();let tel;try{tel=telefone(d.telefone);}catch{return {pedidoId:id,recibo};}await tx(async c=>{
  if(!await limitar(c,'recuperacao',String(d.protocolo)+':'+tel,3,3600000))return;
  const r=await c.query('SELECT id,whatsapp FROM public.solicitacoes WHERE protocolo=$1',[String(d.protocolo||'').slice(0,80)]);const s=r.rows.length===1?r.rows[0]:null;if(!s)return;let cadastrado;try{cadastrado=telefone(s.whatsapp);}catch{return;}if(tel!==cadastrado){await auditar(c,'recuperacao_contato_incompativel',s.id);return;}
  await c.query("INSERT INTO mandato_privado.pedidos_recuperacao(id,solicitacao_id,recibo_hash,telefone_confirmado_verificador,estado) VALUES($1,$2,$3,$4,'pendente')",[id,s.id,h('recibo',recibo),h('telefone:'+id,tel)]);await auditar(c,'recuperacao_solicitada',s.id,null,id);
 });return {pedidoId:id,recibo};},
 async listarRecuperacoes(op){if(!op?.usuarioId)throw falha(403,'Administrador obrigatório.');return (await pool.query(`SELECT r.id,CASE WHEN r.estado='aprovado' AND EXISTS (SELECT 1 FROM mandato_privado.codigos_recuperacao k WHERE k.pedido_id=r.id) THEN 'emitido' ELSE r.estado END AS estado,r.criado_em,s.protocolo,s.whatsapp FROM mandato_privado.pedidos_recuperacao r JOIN public.solicitacoes s ON s.id=r.solicitacao_id WHERE r.recibo_hash IS NOT NULL ORDER BY r.criado_em DESC LIMIT 50`)).rows;},
 async decidir(d,op){if(!op?.mfaRecente||!op.usuarioId||!uuid(d.pedidoId)||!['aprovar','rejeitar'].includes(d.decisao)||d.identidadeConferida!==true)throw falha(403,'MFA recente e conferência de identidade obrigatórios.');const justificativa=texto(d.justificativa,1000);return tx(async c=>{const r=(await c.query('SELECT * FROM mandato_privado.pedidos_recuperacao WHERE id=$1 FOR UPDATE',[d.pedidoId])).rows[0];if(!r?.recibo_hash||r.estado!=='pendente')throw falha(409,'Pedido não está pendente.');const estado=d.decisao==='aprovar'?'aprovado':'rejeitado';await c.query('UPDATE mandato_privado.pedidos_recuperacao SET estado=$2,justificativa=$3,conferente_id=$4,decidido_em=now() WHERE id=$1',[r.id,estado,justificativa,op.usuarioId]);await auditar(c,'recuperacao_'+estado,r.solicitacao_id,op.usuarioId,r.id);return {estado};});},
 async regularizarContato(d,op){
  if(!op?.mfaRecente||!op.usuarioId||!uuid(d.pedidoId)||d.identidadeConferida!==true||d.contatoVerificado!==true)
   throw falha(403,'MFA recente e conferência presencial do contato obrigatórios.');
  // Aprovação por checkbox no navegador não serve como comprovação de posse do destino.
  // A evidência deve vir de um verificador independente integrado apenas no servidor.
  if(typeof validarRegularizacaoContato!=='function')throw falha(503,'Validação confiável do destino indisponível.');
  const justificativa=texto(d.justificativa,1000);
  if(justificativa.length<20)throw falha(400,'Justificativa de pelo menos 20 caracteres obrigatória.');
  const novo=telefone(d.telefoneNovo),confirmado=telefone(d.telefoneConfirmado);
  if(novo!==confirmado||!/^55[1-9]\d{10}$/.test(novo))throw falha(400,'Confirmação de celular brasileiro inválida.');
  return tx(async c=>{
   const {rows:[r]}=await c.query('SELECT p.*,s.whatsapp FROM mandato_privado.pedidos_recuperacao p JOIN public.solicitacoes s ON s.id=p.solicitacao_id WHERE p.id=$1 FOR UPDATE OF p',[d.pedidoId]);
   if(!r?.recibo_hash||r.estado!=='aprovado'||r.conferente_id!==op.usuarioId)throw falha(403,'Aprovação administrativa vinculada obrigatória.');
   const antigo=telefone(r.whatsapp);
   if(/^55[1-9]\d{10}$/.test(antigo))throw falha(409,'Contato já está no formato de celular.');
   if(!r.telefone_confirmado_verificador||!timingSafeEqual(Buffer.from(r.telefone_confirmado_verificador),h('telefone:'+r.id,antigo)))throw falha(403,'Contato original não corresponde ao pedido.');
   // Não altera public.solicitacoes.whatsapp e não reatribui a solicitação.
   // O destino fica vinculado exclusivamente a este pedido, ao conferente MFA e ao HMAC.
   const prova=await validarRegularizacaoContato({
    pedidoId:r.id,solicitacaoId:r.solicitacao_id,operadorId:op.usuarioId,
    telefoneOriginal:'+'+antigo,telefoneNovo:'+'+novo
   });
   const instante=Date.parse(prova?.verificadoEm);
   if(prova?.validado!==true||!uuid(prova.evidenciaId)||
      prova.operadorId!==op.usuarioId||prova.telefoneNovo!=='+'+novo||
      !Number.isFinite(instante)||instante>agora()||agora()-instante>300000)
    throw falha(403,'Falta evidência recente e vinculada à conferência do destino.');
   await c.query('INSERT INTO mandato_privado.contatos_regularizados(pedido_id,telefone_e164,telefone_verificador,justificativa,operador_id,evidencia_id,evidencia_verificada_em) VALUES($1,$2,$3,$4,$5,$6,$7)',
    [r.id,'+'+novo,h('contato-regularizado:'+r.id,novo),justificativa,op.usuarioId,prova.evidenciaId,prova.verificadoEm]);
   await auditar(c,'contato_legado_regularizado',r.solicitacao_id,op.usuarioId,r.id);
   return {regularizado:true,destinoMascarado:'+55 ** *****'+novo.slice(-4)};
  });
 },
 async emitir(d,op){
  if(!op?.mfaRecente||!op.usuarioId||!uuid(d.pedidoId))throw falha(403,'MFA recente obrigatório.');
  return tx(async c=>{
   const {rows:[r]}=await c.query('SELECT p.*,s.whatsapp FROM mandato_privado.pedidos_recuperacao p JOIN public.solicitacoes s ON s.id=p.solicitacao_id WHERE p.id=$1 FOR UPDATE OF p',[d.pedidoId]);
   if(!r||r.estado!=='aprovado'||!r.recibo_hash)throw falha(409,'Aprovação necessária.');
   const telefoneOriginal=telefone(r.whatsapp);
   const {rows:[regularizacao]}=await c.query('SELECT telefone_e164,telefone_verificador,operador_id FROM mandato_privado.contatos_regularizados WHERE pedido_id=$1',[r.id]);
   const destinatario=regularizacao?telefone(regularizacao.telefone_e164):telefoneOriginal;
   const originalConferido=r.telefone_confirmado_verificador&&timingSafeEqual(Buffer.from(r.telefone_confirmado_verificador),h('telefone:'+r.id,telefoneOriginal));
   const destinoConferido=!regularizacao||(regularizacao.operador_id===op.usuarioId&&
    timingSafeEqual(Buffer.from(regularizacao.telefone_verificador),h('contato-regularizado:'+r.id,destinatario))&&
    !/^55[1-9]\d{10}$/.test(telefoneOriginal));
   if(r.conferente_id!==op.usuarioId||telefone(d.telefoneConfirmado)!==destinatario||!originalConferido||!destinoConferido)
    throw falha(403,'Conferência do destinatário necessária.');
   // O cadastro histórico pode conter DDD + apenas 8 dígitos. Não presumir o 9
   // nem liberar código/URI de WhatsApp a um destino ainda não comprovado.
   // A regularização do contato requer um fluxo separado com validação humana e MFA.
   if(!/^55[1-9]\d{10}$/.test(destinatario))throw Object.assign(falha(409,'Contato antigo exige regularização autorizada antes do envio.'),{codigo:'WHATSAPP_LEGADO_SEM_DESTINO'});
   const {rows:[anterior]}=await c.query('SELECT id FROM mandato_privado.codigos_recuperacao WHERE pedido_id=$1',[r.id]);
   if(anterior)throw falha(409,'Código já emitido. Confira a auditoria ou solicite nova recuperação.');
   const codigo=String(randomInt(1000000)).padStart(6,'0'),id=randomUUID();
   const criadoEm=new Date(agora()),expiraEm=new Date(criadoEm.getTime()+300000);
   await c.query('INSERT INTO mandato_privado.codigos_recuperacao(id,pedido_id,codigo_verificador,criado_em,expira_em) VALUES($1,$2,$3,$4,$5)',[id,r.id,h('codigo:'+id,codigo),criadoEm,expiraEm]);
   await auditar(c,'codigo_emitido',r.solicitacao_id,op.usuarioId,r.id);
   return {codigo,telefone:'+'+destinatario,expiraEm:expiraEm.toISOString(),envioPermitido:true,mensagem:'Mandato em Ação: código de recuperação '+codigo+'. Válido por cinco minutos, de uso único. Não compartilhe.'};
  });
 },
 async confirmarEnvio(d,op){
  if(!op?.mfaRecente||!op.usuarioId||d.envioConfirmado!==true||!uuid(d.pedidoId))throw falha(403,'Confirmação administrativa necessária.');
  return tx(async c=>{
   const {rows:[r]}=await c.query('SELECT p.*,k.expira_em,k.usado_em,k.tentativas FROM mandato_privado.pedidos_recuperacao p JOIN mandato_privado.codigos_recuperacao k ON k.pedido_id=p.id WHERE p.id=$1 FOR UPDATE OF p',[d.pedidoId]);
   if(!r||r.estado!=='aprovado'||r.conferente_id!==op.usuarioId||r.usado_em||r.tentativas>=5||agora()>=new Date(r.expira_em).getTime())throw falha(409,'Código indisponível.');
   await auditar(c,'envio_manual_declarado_pelo_admin',r.solicitacao_id,op.usuarioId,r.id);
   return {registrado:true,entregaComprovada:false};
  });
 },
 async validarCodigo(d){
  if(!uuid(d.pedidoId)||!hashChavePrivada(d.recibo)||!/^\d{6}$/.test(d.codigo||''))return {validado:false};
  return tx(async c=>{
   // Serializa rotações de chave mesmo quando existem vários pedidos para o mesmo protocolo.
   const {rows:[s]}=await c.query('SELECT s.id,s.protocolo FROM public.solicitacoes s JOIN mandato_privado.pedidos_recuperacao p ON p.solicitacao_id=s.id WHERE p.id=$1 FOR UPDATE OF s',[d.pedidoId]);
   if(!s)return {validado:false};
   const {rows:[r]}=await c.query('SELECT * FROM mandato_privado.pedidos_recuperacao WHERE id=$1 FOR UPDATE',[d.pedidoId]);
   if(!r?.recibo_hash||!timingSafeEqual(Buffer.from(r.recibo_hash),h('recibo',d.recibo)))return {validado:false};
   if(r.estado!=='aprovado'){
    await auditar(c,r.estado==='concluido'?'codigo_reutilizado':'codigo_indisponivel',s.id,null,r.id);
    return {validado:false};
   }
   const {rows:[k]}=await c.query('SELECT * FROM mandato_privado.codigos_recuperacao WHERE pedido_id=$1 FOR UPDATE',[r.id]);
   if(!k||k.usado_em||k.tentativas>=5)return {validado:false};
   if(agora()>=new Date(k.expira_em).getTime()){
    await c.query("UPDATE mandato_privado.pedidos_recuperacao SET estado='expirado' WHERE id=$1",[r.id]);
    await auditar(c,'codigo_expirado',s.id,null,r.id);
    return {validado:false};
   }
   const ok=timingSafeEqual(Buffer.from(k.codigo_verificador),h('codigo:'+k.id,d.codigo));
   if(!ok){
    await c.query('UPDATE mandato_privado.codigos_recuperacao SET tentativas=tentativas+1 WHERE id=$1',[k.id]);
    if(k.tentativas===4)await c.query("UPDATE mandato_privado.pedidos_recuperacao SET estado='expirado' WHERE id=$1",[r.id]);
    await auditar(c,'codigo_incorreto',s.id,null,r.id);
    return {validado:false};
   }
   const chave=randomBytes(32).toString('base64url');
   await c.query('INSERT INTO mandato_privado.chaves_acompanhamento(solicitacao_id,segredo_verificador) VALUES($1,$2) ON CONFLICT(solicitacao_id) DO UPDATE SET segredo_verificador=EXCLUDED.segredo_verificador,segredo_versao=1,renovada_em=now(),revogada_em=NULL',[s.id,verificarChave(chave)]);
   await c.query("UPDATE mandato_privado.pedidos_recuperacao SET estado='expirado' WHERE solicitacao_id=$1 AND id<>$2 AND recibo_hash IS NOT NULL AND estado IN ('pendente','aprovado')",[s.id,r.id]);
   await c.query('UPDATE mandato_privado.codigos_recuperacao SET usado_em=now() WHERE id=$1',[k.id]);
   await c.query("UPDATE mandato_privado.pedidos_recuperacao SET estado='concluido',concluido_em=now() WHERE id=$1",[r.id]);
   await auditar(c,'codigo_validado_chave_renovada',s.id,null,r.id);
   return {validado:true,protocolo:s.protocolo,novaChave:chave};
  });
 }
 };
}
