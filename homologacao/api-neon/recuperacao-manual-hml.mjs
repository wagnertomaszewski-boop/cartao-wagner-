import {randomUUID,randomBytes,randomInt,createHmac,timingSafeEqual} from 'node:crypto';
const erro=(status,message)=>Object.assign(Error(message),{status});
const uuid=v=>typeof v==='string'&&/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/.test(v);
const telefoneValido=v=>typeof v==='string'&&/^\+55[1-9][0-9]{10}$/.test(v);
const igual=(a,b)=>typeof a==='string'&&typeof b==='string'&&a.length===b.length&&timingSafeEqual(Buffer.from(a),Buffer.from(b));
// Reutiliza pedidos fictícios e a autenticação isolada. Não consulta Supabase.
export function criarRecuperacaoManualHml({pool,segredo,telefoneTeste=null,agora=()=>Date.now(),gerarCodigo=()=>String(randomInt(0,1000000)).padStart(6,'0')}){
 if(typeof segredo!=='string'||segredo.length<48)throw Error('Segredo independente insuficiente');
 const hash=(id,v)=>createHmac('sha256',segredo).update(id+':'+v).digest('hex');
 async function tx(fn){const c=await pool.connect();try{await c.query('BEGIN');const r=await fn(c);await c.query('COMMIT');return r;}catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}}
 const audit=(c,evento,op,id)=>c.query('INSERT INTO auth_admin_hml.auditoria(evento,usuario_id,pedido_id) VALUES($1,$2,$3)',[evento,op?.usuarioId||null,id]);
 async function obter(c,id){if(!uuid(id))throw erro(400,'Pedido inválido');
  const base=await c.query('SELECT solicitacao_id FROM auth_admin_hml.recuperacoes_manuais WHERE id=$1',[id]);
  if(!base.rows[0])throw erro(404,'Pedido não encontrado');
  // Ordem única de locks: primeiro a solicitação, depois seu pedido de recuperação.
  // Evita deadlock quando o sucesso invalida outros pedidos da mesma solicitação.
  await c.query('SELECT id FROM auth_admin_hml.pedidos WHERE id=$1 FOR UPDATE',[base.rows[0].solicitacao_id]);
  const r=await c.query('SELECT r.*,p.protocolo,p.protocolo_publico,p.telefone_cadastrado,p.telefone_autorizacao_hash,p.telefone_autorizado_por FROM auth_admin_hml.recuperacoes_manuais r JOIN auth_admin_hml.pedidos p ON p.id=r.solicitacao_id WHERE r.id=$1 FOR UPDATE OF r',[id]);
  if(!r.rows[0])throw erro(404,'Pedido não encontrado');return r.rows[0];
 }
 const destinoPermitido=p=>(telefoneValido(telefoneTeste)&&p.telefone_cadastrado===telefoneTeste)||(p.telefone_autorizado_por===p.decidido_por&&igual(p.telefone_autorizacao_hash,hash('destino:'+p.solicitacao_id,p.telefone_cadastrado)));
 function conferir(p,d){if(d.identidadeConferida!==true||!telefoneValido(p.telefone_cadastrado)||d.telefoneConfirmado!==p.telefone_cadastrado)throw erro(403,'Confira a identidade e o telefone cadastrado');}
 return {
  async criarFixture(op,d={}){return tx(async c=>{
   const pessoal=Object.keys(d).length>0;
   if(pessoal&&(!telefoneValido(d.telefone)||d.telefone!==d.confirmacaoTelefone||d.autorizoMeuNumero!==true||d.telefone==='+5551000000000'))throw erro(400,'Confirme seu próprio número e a autorização para este teste');
   // O destino pessoal somente pode ser cadastrado nesta fixture administrativa autorizada.
   const telefone=pessoal?d.telefone:(telefoneValido(telefoneTeste)?telefoneTeste:'+5551000000000');
   const id=randomUUID(),protocolo='HML-'+id,chaveInicial=randomBytes(32).toString('base64url');
   await c.query('INSERT INTO auth_admin_hml.pedidos(id,protocolo,chave_hash,telefone_cadastrado) VALUES($1,$2,$3,$4)',[id,protocolo,hash(protocolo,chaveInicial),telefone]);
   if(pessoal){await c.query('UPDATE auth_admin_hml.pedidos SET telefone_autorizacao_hash=$2,telefone_autorizado_por=$3 WHERE id=$1',[id,hash('destino:'+id,telefone),op.usuarioId]);await audit(c,'manual_destino_pessoal_autorizado',op,id);}
   await audit(c,'manual_fixture_criada',op,id);return {id,protocolo,telefone,chaveInicial,ficticio:true};
  });},
  async solicitar({protocolo,telefone}={}){
   // Retorno idêntico com recibo opaco mesmo sem correspondência. Não enumera protocolos.
   const id=randomUUID(),recibo=randomBytes(32).toString('base64url');
   if(typeof protocolo!=='string'||protocolo.length<1||protocolo.length>80||/[\x00-\x1f\x7f]/.test(protocolo)||!telefoneValido(telefone))return {pedidoId:id,recibo,recebido:true};
   await tx(async c=>{
    const r=await c.query('SELECT id FROM auth_admin_hml.pedidos WHERE (protocolo=$1 OR protocolo_publico=$1) AND telefone_cadastrado=$2 FOR UPDATE',[protocolo,telefone]);
    if(!r.rows[0])return;
    const solicitacaoId=r.rows[0].id;
    const n=await c.query("SELECT count(*)::int AS n FROM auth_admin_hml.recuperacoes_manuais WHERE solicitacao_id=$1 AND criado_em>now()-interval '1 hour'",[solicitacaoId]);
    if(n.rows[0].n>=3)return;
    await c.query('INSERT INTO auth_admin_hml.recuperacoes_manuais(id,solicitacao_id,recibo_hash) VALUES($1,$2,$3)',[id,solicitacaoId,hash(id,recibo)]);
    await audit(c,'manual_recuperacao_solicitada',null,id);
   });return {pedidoId:id,recibo,recebido:true};
  },
  async listar(){const r=await pool.query("SELECT r.id,r.situacao,r.criado_em,r.decidido_em,r.justificativa,r.emissoes,r.expira_em,COALESCE(p.protocolo_publico,p.protocolo) AS protocolo,p.telefone_cadastrado AS telefone,CASE WHEN r.consumido_em IS NOT NULL THEN 'utilizado' WHEN r.situacao='bloqueado' THEN 'bloqueado' WHEN r.emissoes=0 THEN 'não emitido' WHEN r.expira_em<=now() THEN 'expirado' WHEN r.codigo_hash IS NULL THEN 'indisponível' ELSE 'vigente' END AS codigo_situacao FROM auth_admin_hml.recuperacoes_manuais r JOIN auth_admin_hml.pedidos p ON p.id=r.solicitacao_id ORDER BY r.criado_em DESC LIMIT 50");return {pedidos:r.rows.map(({codigo_situacao,...p})=>({...p,codigoSituacao:codigo_situacao}))};},
  async auditar(id){return tx(async c=>{await obter(c,id);const r=await c.query('SELECT evento,usuario_id,criado_em FROM auth_admin_hml.auditoria WHERE pedido_id=$1 ORDER BY id',[id]);return {eventos:r.rows};});},
  async decidir(id,op,d){return tx(async c=>{
   const p=await obter(c,id);
   if(p.situacao!=='pendente')throw erro(409,'Pedido já decidido');
   if(!['aprovar','rejeitar'].includes(d.decisao)||typeof d.justificativa!=='string'||d.justificativa.trim().length<10||d.justificativa.length>500||/\d{6}/.test(d.justificativa))throw erro(400,'Informe decisão e justificativa de 10 a 500 caracteres, sem códigos ou dados pessoais');
   if(d.decisao==='aprovar')conferir(p,d);
   await c.query('UPDATE auth_admin_hml.recuperacoes_manuais SET situacao=$2,justificativa=$3,decidido_por=$4,decidido_em=now(),codigo_hash=NULL WHERE id=$1',[id,d.decisao==='aprovar'?'aprovado':'rejeitado',d.justificativa.trim(),op.usuarioId]);
   await audit(c,d.decisao==='aprovar'?'manual_aprovacao':'manual_rejeicao',op,id);
   return {situacao:d.decisao==='aprovar'?'aprovado':'rejeitado'};
  });},
  async emitir(id,op,d){return tx(async c=>{
   const p=await obter(c,id);conferir(p,d);
   if(p.situacao!=='aprovado'||p.decidido_por!==op.usuarioId||p.consumido_em)throw erro(403,'Aprovação vinculada necessária');
   if(p.emissoes>=3)throw erro(429,'Limite de emissões atingido');
   if(p.emitido_em&&agora()-new Date(p.emitido_em).getTime()<60000)throw erro(429,'Aguarde um minuto antes de gerar outro código');
   const emitidoEm=agora(),codigo=gerarCodigo(),desafioId=randomUUID(),expiraEm=new Date(emitidoEm+300000).toISOString();
   if(!/^\d{6}$/.test(codigo))throw Error('Gerador inválido');
   await c.query('UPDATE auth_admin_hml.recuperacoes_manuais SET desafio_id=$2,codigo_hash=$3,expira_em=$4,emitido_em=$5,emissoes=emissoes+1,tentativas=0 WHERE id=$1',[id,desafioId,hash(desafioId,codigo),expiraEm,new Date(emitidoEm).toISOString()]);
   await audit(c,'manual_codigo_gerado',op,id);
   return {desafioId,codigo,expiraEm,telefone:p.telefone_cadastrado,envioPermitido:destinoPermitido(p),
    mensagem:'Mandato em Ação — recuperação de acesso. Seu código temporário é '+codigo+'. Válido por 5 minutos e para um único uso. Digite-o somente na tela onde solicitou a recuperação. Se não pediu, ignore.',entregaConfirmada:false};
  });},
  async registrarAbertura(id,op,d){return tx(async c=>{
   const p=await obter(c,id);conferir(p,d);
   if(!destinoPermitido(p)||p.decidido_por!==op.usuarioId||p.situacao!=='aprovado'||d.desafioId!==p.desafio_id||!p.codigo_hash||new Date(p.expira_em).getTime()<=agora())throw erro(403,'Destino não autorizado ou código inválido');
   await audit(c,'manual_abertura_whatsapp_solicitada',op,id);return {entregaConfirmada:false};
  });},
  async validar({pedidoId,recibo,codigo}={}){
   const negado={confirmado:false};
   if(!uuid(pedidoId)||typeof recibo!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(recibo)||typeof codigo!=='string'||!/^\d{6}$/.test(codigo))return negado;
   return tx(async c=>{
    // Usa a mesma resposta para pedido inexistente, recibo incorreto e código inválido.
    let p;try{p=await obter(c,pedidoId);}catch(e){if(e.status===404)return negado;throw e;}
    if(!igual(p.recibo_hash,hash(pedidoId,recibo)))return negado;
    if(p.consumido_em){await audit(c,'manual_codigo_reuso_bloqueado',null,pedidoId);return negado;}
    if(p.situacao!=='aprovado'||!p.codigo_hash||p.tentativas>=5)return negado;
    if(new Date(p.expira_em).getTime()<=agora()){
     await c.query('UPDATE auth_admin_hml.recuperacoes_manuais SET codigo_hash=NULL WHERE id=$1',[pedidoId]);
     await audit(c,'manual_codigo_expirado',null,pedidoId);return negado;
    }
    const ok=igual(p.codigo_hash,hash(p.desafio_id,codigo));
    if(!ok){await c.query("UPDATE auth_admin_hml.recuperacoes_manuais SET tentativas=tentativas+1,situacao=CASE WHEN tentativas>=4 THEN 'bloqueado' ELSE situacao END,codigo_hash=CASE WHEN tentativas>=4 THEN NULL ELSE codigo_hash END WHERE id=$1",[pedidoId]);await audit(c,'manual_codigo_rejeitado',null,pedidoId);return negado;}
    const novaChave=randomBytes(32).toString('base64url');
    await c.query('UPDATE auth_admin_hml.pedidos SET chave_hash=$2,versao=versao+1 WHERE id=$1',[p.solicitacao_id,hash(p.protocolo,novaChave)]);
    await c.query("UPDATE auth_admin_hml.recuperacoes_manuais SET situacao='concluido',consumido_em=now(),codigo_hash=NULL,tentativas=tentativas+1 WHERE id=$1",[pedidoId]);
    // Uma recuperação substitui todas as outras aprovações pendentes da mesma solicitação.
    await c.query("UPDATE auth_admin_hml.recuperacoes_manuais SET situacao='bloqueado',codigo_hash=NULL WHERE solicitacao_id=$1 AND id<>$2 AND situacao IN ('pendente','aprovado')",[p.solicitacao_id,pedidoId]);
    await audit(c,'manual_codigo_validado',null,pedidoId);await audit(c,'manual_recuperacao_concluida',null,pedidoId);
    return {confirmado:true,protocolo:p.protocolo_publico||p.protocolo,novaChave};
   });
  }
 };
}
