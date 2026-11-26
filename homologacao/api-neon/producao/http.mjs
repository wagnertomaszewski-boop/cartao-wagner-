// Handler candidato para o servidor existente; não montado/ativado automaticamente.
import {LIMITE_CORPO_ANEXO_BYTES} from '../validacao-arquivo-hml.mjs';
import {ORIGEM_WEB} from './configuracao.mjs';
export function criarHandlerProducao({repositorio,resolverAdminMfa,origemApi,reciboWeb=false}){
 if(typeof resolverAdminMfa!=='function'||!repositorio||!origemApi)throw Error('Configuração privada incompleta.');
 const rotas={'admin/sessao/validar':'validarSessao','solicitacoes/cadastrar':'cadastrar','solicitacoes/consultar':'consultar','arquivos/anexar':'anexar','arquivos/baixar':'baixar','recuperacao/solicitar':'solicitarRecuperacao','recuperacao/validar':'validarCodigo','admin/recuperacao/listar':'listarRecuperacoes','admin/recuperacao/decidir':'decidir','admin/recuperacao/regularizar-contato':'regularizarContato','admin/recuperacao/emitir':'emitir','admin/recuperacao/confirmar-envio':'confirmarEnvio'};
 const prefixoWeb='recuperacao/navegador/';
 const nomeCookie='__Secure-mandato_recibo';
 const cookiePath='/functions/v1/mandato-privado/api/v1/recuperacao/navegador';
 const cookie=(valor,idade)=>nomeCookie+'='+valor+'; Path='+cookiePath+'; Max-Age='+idade+'; HttpOnly; Secure; SameSite=None; Partitioned';
 return async function handler(req,res){
  if(!req.url?.startsWith('/api/v1/'))return false;
  // CORS protege navegadores, mas não é autenticação. Clientes Android/nativos
  // podem não enviar Origin: aceitar somente sua ausência real (undefined),
  // sem devolver Access-Control-Allow-Origin. Origem 'null'/vazia continua negada.
  const origin=req.headers.origin;
  const caminho=req.url.slice('/api/v1/'.length);
  const web=reciboWeb&&['solicitar','validar'].some(acao=>caminho===prefixoWeb+acao);
  const origemReconhecida=[ORIGEM_WEB,origemApi].includes(origin);
  const semOrigin=origin===undefined;
  const permitida=origemReconhecida||semOrigin;
  const send=(s,d,extras={})=>{res.writeHead(s,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Vary':'Origin',...(origemReconhecida?{'Access-Control-Allow-Origin':origin}:{}),...(web&&origemReconhecida?{'Access-Control-Allow-Credentials':'true'}:{}),...extras});res.end(JSON.stringify(d));};
  if(!permitida||(web&&!origemReconhecida)||(req.method==='OPTIONS'&&semOrigin)){send(403,{erro:'Origem não autorizada.'});return true;}
  if(req.method==='OPTIONS'){res.writeHead(204,{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type, Authorization','Vary':'Origin','Cache-Control':'no-store',...(web?{'Access-Control-Allow-Credentials':'true'}:{})});res.end();return true;}
  const rota=web?'recuperacao/'+caminho.slice(prefixoWeb.length):caminho,nome=Object.hasOwn(rotas,rota)?rotas[rota]:null;if(req.method!=='POST'||!nome){send(404,{erro:'Rota não encontrada.'});return true;}
  try{
   // IP do cliente não é confiável por cabeçalho arbitrário. Limite global seguro;
   // limitação adicional por telefone/recuperação é persistida no banco.
   if(!await repositorio.limitarEntrada('api-v1-global')){send(429,{erro:'Aguarde.'});return true;}
   let op=null;if(rota.startsWith('admin/')){const a=req.headers.authorization||'';if(!/^Bearer \S+$/.test(a)){send(401,{erro:'Autenticação necessária.'});return true;}op=await resolverAdminMfa(a.slice(7));if(!op?.usuarioId||!op.mfaRecente){send(403,{erro:'MFA recente obrigatório.'});return true;}}
   if(!/^application\/json(?:;|$)/i.test(req.headers['content-type']||'')){send(415,{erro:'Envie JSON.'});return true;}
   const limite=nome==='anexar'?LIMITE_CORPO_ANEXO_BYTES:20000;
   if(Number(req.headers['content-length'])>limite)throw Object.assign(Error(),{status:413});
   const partes=[];let n=0;for await(const b of req){n+=b.length;if(n>limite)throw Object.assign(Error(),{status:413});partes.push(b);}let d;try{d=JSON.parse(Buffer.concat(partes));}catch{throw Object.assign(Error(),{status:400});}if(!d||typeof d!=='object'||Array.isArray(d))throw Object.assign(Error(),{status:400});
   if(web&&nome==='solicitarRecuperacao'){
    const {pedidoId,recibo}=await repositorio.solicitarRecuperacao(d);
    send(200,{recebido:true},{'Set-Cookie':cookie(pedidoId+'.'+recibo,86400)});return true;
   }
   if(web&&nome==='validarCodigo'){
    const prefixo=nomeCookie+'=';
    const candidatos=(req.headers.cookie||'').split(';').map(x=>x.trim()).filter(x=>x.startsWith(prefixo));
    const valor=candidatos.length===1?candidatos[0].slice(prefixo.length):'';
    const recibo=/^([0-9a-f-]{36})\.([A-Za-z0-9_-]{43})$/.exec(valor);
    if(!recibo){send(200,{validado:false,reciboAusente:true});return true;}
    const resultado=await repositorio.validarCodigo({pedidoId:recibo[1],recibo:recibo[2],codigo:d.codigo,formatoChave:d.formatoChave});
    send(200,resultado,resultado.validado===true?{'Set-Cookie':cookie('',0)}:{});return true;
   }
   const resposta=nome==='validarSessao'?{autenticado:true,mfaRecente:true}:nome==='listarRecuperacoes'?await repositorio[nome](op):await repositorio[nome](d,op);send(200,resposta);
  }catch(e){
   const pendenciaContato=rota==='admin/recuperacao/emitir'&&e.status===409&&e.codigo==='WHATSAPP_LEGADO_SEM_DESTINO';
   send([400,403,409,413,429].includes(e.status)?e.status:503,pendenciaContato
    ?{erro:'O cadastro antigo não tem destino de WhatsApp confirmado. A regularização exige conferência de identidade e autorização administrativa.',codigo:'WHATSAPP_LEGADO_SEM_DESTINO'}
    :{erro:'Operação não concluída.'});
  }
  return true;
 };
}
