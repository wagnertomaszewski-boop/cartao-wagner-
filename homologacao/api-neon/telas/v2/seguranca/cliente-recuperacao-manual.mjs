export const ORIGEM_HML='https://mandato-neon-homologacao.onrender.com';
const uuid=/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/;
export function normalizarTelefone(valor){let n=String(valor||'').replace(/[^0-9]/g,'');if(n.length===11)n='55'+n;if(!/^55[1-9][0-9]{10}$/.test(n))throw Error('Informe o telefone cadastrado com DDD.');return '+'+n;}
export function criarClienteRecuperacaoManual({origem,buscar=globalThis.fetch}={}){
 if(origem!==ORIGEM_HML)throw Error('Recuperação disponível somente na homologação.');
 async function enviar(path,data,admin=false){const r=await buscar(origem+'/hml'+path,{method:data===undefined?'GET':'POST',credentials:admin?'same-origin':'omit',cache:'no-store',redirect:'error',signal:AbortSignal.timeout(15000),headers:data===undefined?{}:{'Content-Type':'application/json'},body:data===undefined?undefined:JSON.stringify(data)});let v;try{v=await r.json();}catch{throw Error('Serviço indisponível. Tente novamente.');}if(!r.ok){if(r.status===401||r.status===403)throw Error('Entre e confirme novamente o MFA para esta operação.');if(r.status===429)throw Error('Limite de tentativas atingido. Aguarde antes de tentar novamente.');throw Error('Não foi possível concluir. Confira os dados e tente novamente.');}return v;}
 const protocolo=p=>{if(typeof p!=='string'||p.trim().length<1||p.trim().length>80||/[\x00-\x1f\x7f]/.test(p))throw Error('Informe um protocolo válido.');return p.trim();};
 const id=p=>{if(!uuid.test(String(p)))throw Error('Pedido inválido.');return p;};
 return {
  cadastrar:d=>enviar('/cidadao/cadastrar',d),catalogo:()=>enviar('/modelo/solicitacoes',undefined,true),fixtureLegada:cenario=>enviar('/modelo/legado',{cenario},true),
  estado:()=>enviar('/api/estado',undefined,true),listar:()=>enviar('/manual/pedidos',undefined,true),
  consultar:({protocolo:p,chave})=>{const proto=protocolo(p);if(typeof chave!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(chave))throw Error('Informe a chave de acompanhamento. O protocolo sozinho não permite consultar.');return enviar('/cidadao/consultar',{protocolo:proto,chave});},
  solicitar:({protocolo:p,telefone})=>enviar('/manual/solicitar',{protocolo:protocolo(p),telefone:normalizarTelefone(telefone)}),
  validar:({pedidoId,recibo,codigo})=>{id(pedidoId);if(!/^[A-Za-z0-9_-]{43}$/.test(String(recibo))||!/^\d{6}$/.test(String(codigo)))throw Error('Informe o código de seis dígitos.');return enviar('/manual/validar',{pedidoId,recibo,codigo});},
  decidir:(pedido,d)=>enviar('/manual/pedidos/'+id(pedido)+'/decidir',d,true),
  emitir:(pedido,d)=>enviar('/manual/pedidos/'+id(pedido)+'/emitir',d,true),
  preparar:(pedido,d)=>enviar('/manual/pedidos/'+id(pedido)+'/abrir',d,true),
  auditoria:pedido=>enviar('/manual/pedidos/'+id(pedido)+'/auditoria',undefined,true)
 };
}
export function uriWhatsappPrivada(emissao,agora=Date.now()){
 if(emissao?.envioPermitido!==true||!/^\+55[1-9][0-9]{10}$/.test(emissao.telefone)||!/^\d{6}$/.test(emissao.codigo)||typeof emissao.mensagem!=='string'||!Number.isFinite(Date.parse(emissao.expiraEm))||agora>=Date.parse(emissao.expiraEm))throw Error('Confira o destino autorizado e a validade do código.');
 return 'whatsapp://send?phone='+emissao.telefone.slice(1)+'&text='+encodeURIComponent(emissao.mensagem);
}
