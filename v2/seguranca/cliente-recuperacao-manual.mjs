export const ORIGEM_HML='https://mandato-neon-homologacao.onrender.com';
const uuid=/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/;
export function normalizarTelefone(valor){let n=String(valor||'').replace(/[^0-9]/g,'');if(n.length===11)n='55'+n;if(!/^55[1-9][0-9]{10}$/.test(n))throw Error('Informe o telefone cadastrado com DDD.');return '+'+n;}
export function criarClienteRecuperacaoManual({origem,buscar=globalThis.fetch}={}){
 if(origem!==ORIGEM_HML)throw Error('Recuperação disponível somente na homologação.');
 async function enviar(path,data,admin=false){const r=await buscar(origem+'/hml'+path,{method:data===undefined?'GET':'POST',credentials:admin?'same-origin':'omit',cache:'no-store',redirect:'error',signal:AbortSignal.timeout(15000),headers:data===undefined?{}:{'Content-Type':'application/json'},body:data===undefined?undefined:JSON.stringify(data)});let v;try{v=await r.json();}catch{throw Error('Serviço indisponível. Tente novamente.');}if(!r.ok){if(r.status===401||r.status===403)throw Error(admin?'Entre e confirme novamente o MFA para esta operação.':'Protocolo ou chave inválidos, ou acesso não autorizado.');if(r.status===409)throw Error('Os dados mudaram ou a operação já foi registrada. Recarregue antes de repetir.');if(r.status===429)throw Error('Limite de tentativas atingido. Aguarde antes de tentar novamente.');throw Error('Não foi possível concluir. Confira os dados e tente novamente.');}return v;}
 const protocolo=p=>{if(typeof p!=='string'||p.trim().length<1||p.trim().length>80||/[\x00-\x1f\x7f]/.test(p))throw Error('Informe um protocolo válido.');return p.trim();};
 const id=p=>{if(!uuid.test(String(p)))throw Error('Pedido inválido.');return p;};
 return {
  confirmarLeitura:d=>enviar('/cidadao/confirmar-leitura',d),
  gerarQr:d=>enviar('/cidadao/qr',d),anexar:d=>enviar('/cidadao/arquivo/anexar',d),baixar:d=>enviar('/cidadao/arquivo/baixar',d),anexarInterno:d=>enviar('/modelo/arquivo/anexar',d,true),baixarInterno:d=>enviar('/modelo/arquivo/baixar',d,true),
  anexarConteudo:d=>enviar('/conteudos/arquivo',d,true),
  conteudos:()=>enviar('/conteudos',undefined,true),salvarConteudo:d=>enviar('/conteudos',d,true),
  dashboard:()=>enviar('/modelo/dashboard',undefined,true),gerir:(pedido,acao,d)=>{if(!['atualizar','responder','fiscalizar','acompanhar','aviso'].includes(acao))throw Error('Ação inválida.');return enviar('/modelo/solicitacoes/'+id(pedido)+'/'+acao,d,true);},auditarSolicitacao:pedido=>enviar('/modelo/solicitacoes/'+id(pedido)+'/auditoria',undefined,true),
  cadastrar:d=>enviar('/cidadao/cadastrar',d),catalogo:d=>enviar('/modelo/solicitacoes',d,true),fixtureLegada:cenario=>enviar('/modelo/legado',{cenario},true),
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

export function formatarDataMandato(valor,somenteHora=false){
 if(typeof valor==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(valor)){const [a,m,d]=valor.split('-').map(Number),t=new Date(Date.UTC(a,m-1,d));return t.getUTCFullYear()===a&&t.getUTCMonth()===m-1&&t.getUTCDate()===d?String(d).padStart(2,'0')+'/'+String(m).padStart(2,'0')+'/'+a:'Data não informada';}
 const d=new Date(valor);if(!valor||!Number.isFinite(d.getTime()))return 'Data não informada';
 return somenteHora?d.toLocaleTimeString('pt-BR',{timeZone:'America/Sao_Paulo'}):d.toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'});
}

export function salvarArquivoLocal(arquivo){
 if(!arquivo||!['image/png','image/jpeg','application/pdf','text/csv'].includes(arquivo.mime)||typeof arquivo.nome!=='string'||typeof arquivo.base64!=='string')throw Error('Arquivo inválido.');
 if(globalThis.MandatoArquivos&&typeof globalThis.MandatoArquivos.salvar==='function'){globalThis.MandatoArquivos.salvar(arquivo.nome,arquivo.mime,arquivo.base64);return;}
 const bytes=Uint8Array.from(atob(arquivo.base64),x=>x.charCodeAt(0)),url=URL.createObjectURL(new Blob([bytes],{type:arquivo.mime})),link=document.createElement('a');link.href=url;link.download=arquivo.nome;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
