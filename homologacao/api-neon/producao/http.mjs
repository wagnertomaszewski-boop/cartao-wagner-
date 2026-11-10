// Handler candidato para o servidor existente; não montado/ativado automaticamente.
import {ORIGEM_WEB} from './configuracao.mjs';
export function criarHandlerProducao({repositorio,resolverAdminMfa,origemApi}){
 if(typeof resolverAdminMfa!=='function'||!repositorio||!origemApi)throw Error('Configuração privada incompleta.');
 const rotas={'admin/sessao/validar':'validarSessao','solicitacoes/cadastrar':'cadastrar','solicitacoes/consultar':'consultar','arquivos/anexar':'anexar','arquivos/baixar':'baixar','recuperacao/solicitar':'solicitarRecuperacao','recuperacao/validar':'validarCodigo','admin/recuperacao/listar':'listarRecuperacoes','admin/recuperacao/decidir':'decidir','admin/recuperacao/emitir':'emitir','admin/recuperacao/confirmar-envio':'confirmarEnvio'};
 return async function handler(req,res){
  if(!req.url?.startsWith('/api/v1/'))return false;
  const origin=req.headers.origin,permitida=[ORIGEM_WEB,origemApi].includes(origin);
  const send=(s,d)=>{res.writeHead(s,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Vary':'Origin',...(permitida?{'Access-Control-Allow-Origin':origin}:{})});res.end(JSON.stringify(d));};
  if(!permitida){send(403,{erro:'Origem não autorizada.'});return true;}
  if(req.method==='OPTIONS'){res.writeHead(204,{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type, Authorization','Vary':'Origin','Cache-Control':'no-store'});res.end();return true;}
  const rota=req.url.slice('/api/v1/'.length),nome=rotas[rota];if(req.method!=='POST'||!nome){send(404,{erro:'Rota não encontrada.'});return true;}
  try{
   // IP do cliente não é confiável por cabeçalho arbitrário. Limite global seguro;
   // limitação adicional por telefone/recuperação é persistida no banco.
   if(!await repositorio.limitarEntrada('api-v1-global')){send(429,{erro:'Aguarde.'});return true;}
   let op=null;if(rota.startsWith('admin/')){const a=req.headers.authorization||'';if(!/^Bearer \S+$/.test(a)){send(401,{erro:'Autenticação necessária.'});return true;}op=await resolverAdminMfa(a.slice(7));if(!op?.usuarioId||!op.mfaRecente){send(403,{erro:'MFA recente obrigatório.'});return true;}}
   if(!/^application\/json(?:;|$)/i.test(req.headers['content-type']||'')){send(415,{erro:'Envie JSON.'});return true;}
   const partes=[];let n=0;for await(const b of req){n+=b.length;if(n>(nome==='anexar'?1500000:20000))throw Object.assign(Error(),{status:413});partes.push(b);}let d;try{d=JSON.parse(Buffer.concat(partes));}catch{throw Object.assign(Error(),{status:400});}if(!d||typeof d!=='object'||Array.isArray(d))throw Object.assign(Error(),{status:400});
   const resposta=nome==='validarSessao'?{autenticado:true,mfaRecente:true}:nome==='listarRecuperacoes'?await repositorio[nome](op):await repositorio[nome](d,op);send(200,resposta);
  }catch(e){send([400,403,409,413,429].includes(e.status)?e.status:503,{erro:'Operação não concluída.'});}
  return true;
 };
}
