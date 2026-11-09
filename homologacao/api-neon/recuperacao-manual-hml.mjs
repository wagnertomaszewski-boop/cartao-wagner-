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
  const r=await c.query('SELECT r.*,p.protocolo,p.telefone_cadastrado FROM auth_admin_hml.recuperacoes_manuais r JOIN auth_admin_hml.pedidos p ON p.id=r.solicitacao_id WHERE r.id=$1 FOR UPDATE OF r,p',[id]);
  if(!r.rows[0])throw erro(404,'Pedido não encontrado');return r.rows[0];
 }
 function conferir(p,d){if(d.identidadeConferida!==true||!telefoneValido(p.telefone_cadastrado)||d.telefoneConfirmado!==p.telefone_cadastrado)throw erro(403,'Confira a identidade e o telefone cadastrado');}
 return {
  async criarFixture(op){return tx(async c=>{
   // Destino inexistente por padrão; nunca permite entrada livre de telefone no painel.
   const telefone=telefoneValido(telefoneTeste)?telefoneTeste:'+5551000000000';
   const id=randomUUID(),protocolo='HML-'+id,chaveInicial=randomBytes(32).toString('base64url');
   await c.query('INSERT INTO auth_admin_hml.pedidos(id,protocolo,chave_hash,telefone_cadastrado) VALUES($1,$2,$3,$4)',[id,protocolo,hash(protocolo,chaveInicial),telefone]);
   await audit(c,'manual_fixture_criada',op,id);return {id,protocolo,telefone,chaveInicial,ficticio:true};
  });},
  async solicitar({protocolo,telefone}={}){
   // Retorno idêntico com recibo opaco mesmo sem correspondência. Não enumera protocolos.
   const id=randomUUID(),recibo=randomBytes(32).toString('base64url');
   if(typeof protocolo!=='string'||!/^HML-[0-9a-f-]{36}$/.test(protocolo)||!telefoneValido(telefone))return {pedidoId:id,recibo,recebido:true};
   await tx(async c=>{
    const r=await c.query('SELECT id FROM auth_admin_hml.pedidos WHERE protocolo=$1 AND telefone_cadastrado=$2 FOR UPDATE',[protocolo,telefone]);
    if(!r.rows[0])return;
    const solicitacaoId=r.rows[0].id;
    const n=await c.query("SELECT count(*)::int AS n FROM auth_admin_hml.recuperacoes_manuais WHERE solicitacao_id=$1 AND criado_em>now()-interval '1 hour'",[solicitacaoId]);
    if(n.rows[0].n>=3)return;
    await c.query('INSERT INTO auth_admin_hml.recuperacoes_manuais(id,solicitacao_id,recibo_hash) VALUES($1,$2,$3)',[id,solicitacaoId,hash(id,recibo)]);
    await audit(c,'manual_recuperacao_solicitada',null,id);
   });return {pedidoId:id,recibo,recebido:true};
  },
  async listar(){const r=await pool.query('SELECT r.id,r.situacao,r.criado_em,r.decidido_em,r.justificativa,r.emissoes,r.expira_em,p.protocolo,p.telefone_cadastrado AS telefone FROM auth_admin_hml.recuperacoes_manuais r JOIN auth_admin_hml.pedidos p ON p.id=r.solicitacao_id ORDER BY r.criado_em DESC LIMIT 50');return {pedidos:r.rows};},
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
   const codigo=gerarCodigo(),desafioId=randomUUID(),expiraEm=new Date(agora()+300000).toISOString();
   if(!/^\d{6}$/.test(codigo))throw Error('Gerador inválido');
   await c.query('UPDATE auth_admin_hml.recuperacoes_manuais SET desafio_id=$2,codigo_hash=$3,expira_em=$4,emitido_em=$5,emissoes=emissoes+1,tentativas=0 WHERE id=$1',[id,desafioId,hash(desafioId,codigo),expiraEm,new Date(agora()).toISOString()]);
   await audit(c,'manual_codigo_gerado',op,id);
   return {desafioId,codigo,expiraEm,telefone:p.telefone_cadastrado,envioPermitido:telefoneValido(telefoneTeste)&&p.telefone_cadastrado===telefoneTeste,
    mensagem:'Mandato em Ação — recuperação de acesso. Seu código temporário é '+codigo+'. Válido por 5 minutos e para um único uso. Digite-o somente na tela onde solicitou a recuperação. Se não pediu, ignore.',entregaConfirmada:false};
  });},
  async registrarAbertura(id,op,d){return tx(async c=>{
   const p=await obter(c,id);conferir(p,d);
   if(!telefoneValido(telefoneTeste)||p.telefone_cadastrado!==telefoneTeste||p.decidido_por!==op.usuarioId||p.situacao!=='aprovado'||d.desafioId!==p.desafio_id||!p.codigo_hash||new Date(p.expira_em).getTime()<=agora())throw erro(403,'Destino não autorizado ou código inválido');
   await audit(c,'manual_abertura_whatsapp_solicitada',op,id);return {entregaConfirmada:false};
  });},
  async validar({pedidoId,recibo,codigo}={}){
   const negado={confirmado:false};
   if(!uuid(pedidoId)||typeof recibo!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(recibo)||typeof codigo!=='string'||!/^\d{6}$/.test(codigo))return negado;
   return tx(async c=>{
    // Usa a mesma resposta para pedido inexistente, recibo incorreto e código inválido.
    let p;try{p=await obter(c,pedidoId);}catch(e){if(e.status===404)return negado;throw e;}
    if(!igual(p.recibo_hash,hash(pedidoId,recibo)))return negado;
    if(p.situacao!=='aprovado'||!p.codigo_hash||p.consumido_em||p.tentativas>=5)return negado;
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
    return {confirmado:true,protocolo:p.protocolo,novaChave};
   });
  }
 };
}
