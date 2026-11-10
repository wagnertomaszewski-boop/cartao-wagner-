import {Buffer} from 'node:buffer';
// Adapta o handler existente a Request/Response; não duplica regras de acesso.
export function adaptarParaEdge(handler,{versao}){return async request=>{
 const url=new URL(request.url),prefixo='/functions/v1/mandato-privado';
 if(!url.pathname.startsWith(prefixo+'/')||url.search)return new Response('Rota inválida',{status:404});
 const path=url.pathname.slice(prefixo.length);
 if(path==='/health'&&request.method==='GET')return Response.json({status:'ok',ambiente:'producao',versao},{headers:{'Cache-Control':'no-store'}});
 let status=500,cabecalhos={},conteudo='';const headers=Object.fromEntries(request.headers);
 const req={url:path,method:request.method,headers,async *[Symbol.asyncIterator](){if(!request.body)return;const reader=request.body.getReader();try{while(true){const v=await reader.read();if(v.done)break;yield Buffer.from(v.value);}}finally{reader.releaseLock();}}};
 const res={writeHead(s,h){status=s;cabecalhos=h;},end(b=''){conteudo=b;}};
 if(!await handler(req,res))return new Response('Não encontrado',{status:404});return new Response(conteudo||null,{status,headers:cabecalhos});
};}
