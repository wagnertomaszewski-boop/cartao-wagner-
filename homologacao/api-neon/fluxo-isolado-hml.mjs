import {randomUUID,randomBytes,randomInt,createHmac,timingSafeEqual} from 'node:crypto';
const erro=(status,message)=>Object.assign(Error(message),{status});
export function criarFluxoIsoladoHml({pool,segredo,enviarCodigo=null,telefoneTeste=null}){
 const hash=(id,v)=>createHmac('sha256',segredo).update(id+':'+v).digest('hex');
 async function tx(fn){const c=await pool.connect();try{await c.query('BEGIN');const r=await fn(c);await c.query('COMMIT');return r;}catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}}
 async function audit(c,evento,op,id){await c.query('INSERT INTO auth_admin_hml.auditoria(evento,usuario_id,pedido_id) VALUES($1,$2,$3)',[evento,op?.usuarioId||null,id]);}
 const idValido=id=>typeof id==='string'&&/^[0-9a-f-]{36}$/.test(id);
 async function obter(c,id){if(!idValido(id))throw erro(400,'Pedido de teste inválido');const r=await c.query('SELECT * FROM auth_admin_hml.pedidos WHERE id=$1 FOR UPDATE',[id]);if(!r.rows[0])throw erro(404,'Pedido de teste não encontrado');return r.rows[0];}
 return {
  transporteDisponivel:typeof enviarCodigo==='function'&&/^\+55[1-9][0-9]{10}$/.test(telefoneTeste||''),
  async criar(op){return tx(async c=>{
   const id=randomUUID(),protocolo='HML-'+id,chave=randomBytes(32).toString('base64url');
   await c.query('INSERT INTO auth_admin_hml.pedidos(id,protocolo,chave_hash) VALUES($1,$2,$3)',[id,protocolo,hash(protocolo,chave)]);
   await audit(c,'fixture_criada',op,id);return {id,protocolo,chaveInicial:chave};
  });},
  async aprovar(id,op){return tx(async c=>{const p=await obter(c,id);if(p.consumido_em||p.aprovado_em)throw erro(409,'Pedido já aprovado ou concluído');
   await c.query('UPDATE auth_admin_hml.pedidos SET aprovado_por=$2,aprovado_em=now() WHERE id=$1',[id,op.usuarioId]);
   await audit(c,'aprovacao_auditada',op,id);return {aprovado:true};
  });},
  async iniciar(id,op){
   if(typeof enviarCodigo!=='function'||!/^\+55[1-9][0-9]{10}$/.test(telefoneTeste||''))throw erro(503,'WhatsApp de teste ainda não configurado');
   const desafioId=randomUUID(),codigo=String(randomInt(0,1000000)).padStart(6,'0');
   await tx(async c=>{const p=await obter(c,id);if(!p.aprovado_em||p.aprovado_por!==op.usuarioId||p.consumido_em)throw erro(403,'Aprovação vinculada necessária');
    if(p.expira_em&&Date.now()-new Date(p.expira_em).getTime() < -240000)throw erro(429,'Aguarde antes de reenviar');
    await c.query("UPDATE auth_admin_hml.pedidos SET desafio_id=$2,codigo_hash=$3,expira_em=now()+interval '5 minutes',tentativas=0,confirmado_em=NULL WHERE id=$1",[id,desafioId,hash(desafioId,codigo)]);
   });
   let enviado=false;try{enviado=await enviarCodigo({telefone:telefoneTeste,codigo})===true;}catch{}
   await tx(async c=>{await obter(c,id);if(!enviado)await c.query('UPDATE auth_admin_hml.pedidos SET expira_em=now() WHERE id=$1 AND desafio_id=$2',[id,desafioId]);await audit(c,enviado?'whatsapp_aceito_provedor':'whatsapp_envio_falhou',op,id);});
   if(!enviado)throw erro(503,'Envio pelo WhatsApp não confirmado');
   return {desafioId,expiraEm:new Date(Date.now()+300000).toISOString(),aviso:'Aceite do provedor; recebimento depende da confirmação do código.'};
  },
  async confirmar({pedidoId,desafioId,codigo}){
   if(!idValido(pedidoId)||!idValido(desafioId)||typeof codigo!=='string'||!/^\d{6}$/.test(codigo))return {confirmado:false};
   return tx(async c=>{const p=await obter(c,pedidoId);
    if(p.desafio_id!==desafioId||!p.expira_em||new Date(p.expira_em)<=new Date()||p.tentativas>=5||p.confirmado_em||p.consumido_em)return {confirmado:false};
    const ok=p.codigo_hash===hash(desafioId,codigo);
    await c.query('UPDATE auth_admin_hml.pedidos SET tentativas=tentativas+1,confirmado_em=CASE WHEN $2 THEN now() ELSE confirmado_em END WHERE id=$1',[pedidoId,ok]);
    await audit(c,ok?'whatsapp_codigo_confirmado':'whatsapp_codigo_rejeitado',null,pedidoId);return {confirmado:ok};
   });
  },
  async concluir(id,op){return tx(async c=>{const p=await obter(c,id);
   if(!p.aprovado_em||p.aprovado_por!==op.usuarioId||!p.confirmado_em||new Date(p.expira_em)<=new Date()||p.consumido_em)throw erro(403,'Aprovação e confirmação WhatsApp vigentes necessárias');
   const chave=randomBytes(32).toString('base64url');
   await c.query('UPDATE auth_admin_hml.pedidos SET chave_hash=$2,versao=versao+1,consumido_em=now(),codigo_hash=NULL WHERE id=$1',[id,hash(p.protocolo,chave)]);
   await audit(c,'recuperacao_concluida_chave_substituida',op,id);return {protocolo:p.protocolo,novaChave:chave};
  });},
  async consultar({protocolo,chave}){
   if(typeof protocolo!=='string'||protocolo.length<1||protocolo.length>80||/[\x00-\x1f\x7f]/.test(protocolo)||typeof chave!=='string'||! /^[A-Za-z0-9_-]{43}$/.test(chave))return {encontrado:false};
   const r=await pool.query('SELECT protocolo,protocolo_publico,chave_hash,versao,dados_solicitacao FROM auth_admin_hml.pedidos WHERE protocolo=$1 OR protocolo_publico=$1',[protocolo]);
   const p=r.rows[0];if(!p||!timingSafeEqual(Buffer.from(p.chave_hash),Buffer.from(hash(p.protocolo,chave))))return {encontrado:false};
   const d=p.dados_solicitacao;
   return d?{encontrado:true,protocolo:p.protocolo_publico||p.protocolo,versao:p.versao,assunto:d.assunto,descricao:d.descricao,localidade:d.localidade,status:d.status,criadoEm:d.criadoEm,historico:d.historico,respostas:d.respostas,anexos:d.anexos}:{encontrado:true,assunto:'Solicitação fictícia de homologação',versao:p.versao};
  },
  async auditoria(){const r=await pool.query('SELECT evento,pedido_id,criado_em FROM auth_admin_hml.auditoria ORDER BY id DESC LIMIT 30');return r.rows;}
 };
}
