import {ativarMascaraTelefone,normalizarTelefoneRecuperacao,pedirTelefone} from './telefone.js';
const $=id=>document.getElementById(id);
ativarMascaraTelefone($('telefone'));
const status=$('estado');
const padrao='+5551000000000';
const telefone=()=>{
 const valor=$('telefone').value.trim();
 if(valor&&!$('consentimento').checked)throw Error('Confirme o consentimento para usar seu próprio número.');
 return valor?normalizarTelefoneRecuperacao(valor):padrao;
};
const credencial=()=>({protocolo:$('protocolo').value.trim(),chave:$('chave').value.trim()});
async function api(rota,dados={}){
 const r=await fetch('/hml/candidata/api/v1/'+rota,{method:'POST',credentials:'same-origin',referrerPolicy:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(dados),cache:'no-store',redirect:'error',signal:AbortSignal.timeout(rota.includes('arquivos/')||rota.endsWith('/baixar-anexo')?90000:20000)});
 const j=await r.json();
 if(!r.ok)throw Error(j.erro||'Operação indisponível.');
 return j;
}
let ocupado=false;
async function executar(fn){
 if(ocupado)return;
 ocupado=true;status.textContent='Aguarde…';
 try{status.textContent=await fn();}catch(e){status.textContent=e.message;}
 finally{ocupado=false;}
}
function botao(nome,fn){
 const b=document.createElement('button');b.type='button';b.textContent=nome;b.onclick=()=>executar(fn);return b;
}
function salvarAnexo(f){
 const bytes=Uint8Array.from(atob(f.base64),x=>x.charCodeAt(0));
  const url=URL.createObjectURL(new Blob([bytes],{type:f.mime}));
  const link=document.createElement('a');link.href=url;link.download=f.nome;link.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function mostrarAnexos(itens){
 $('anexos').replaceChildren(...itens.map(a=>botao('Baixar '+a.nome,async()=>{
  const f=await api('arquivos/baixar',{...credencial(),arquivoId:a.id});
  salvarAnexo(f);
  return 'Download autorizado pela API candidata.';
 })));
}
let operacaoId=crypto.randomUUID();
$('cadastro').onsubmit=e=>{
 e.preventDefault();
 void executar(async()=>{
  const d=await api('solicitacoes/cadastrar',{operacaoId,p_nome:'Cidadão fictício',p_whatsapp:telefone(),p_localidade:'Homologação',p_assunto:'Solicitação de teste',p_descricao:'Dados sintéticos da API candidata.'});
  operacaoId=crypto.randomUUID();
  $('protocolo').value=d.protocolo;$('chave').value=d.chaveInicial;mostrarAnexos([]);
  return 'Solicitação fictícia criada. Guarde o protocolo e a chave.';
 });
};
$('consultar').onclick=()=>executar(async()=>{
 mostrarAnexos([]);
 const r=await api('solicitacoes/consultar',credencial());
 if(!r.encontrado)return 'Protocolo ou chave inválidos.';
 mostrarAnexos(r.anexos);
 return 'Consulta autorizada. Situação: '+r.status;
});
$('anexar').onclick=()=>executar(async()=>{
 const png='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j1ioAAAAASUVORK5CYII=';
 const a=await api('arquivos/anexar',{...credencial(),nome:'homologacao.png',mime:'image/png',base64:png});
 mostrarAnexos([a]);
 return 'Imagem fictícia enviada ao Storage privado de teste.';
});
$('solicitar').onclick=()=>executar(async()=>{
 await api('recuperacao/solicitar',{protocolo:credencial().protocolo,telefone:telefone()});
 return 'Pedido registrado para análise, se os dados corresponderem ao cadastro.';
});
$('validar').onclick=()=>executar(async()=>{
 const codigo=$('codigo').value;$('codigo').value='';
 const d=await api('recuperacao/validar',{codigo});
 if(d.reciboAusente)return 'Pedido não encontrado neste navegador. Inicie uma nova recuperação.';
 if(!d.validado)return 'Código incorreto, expirado ou já usado.';
 $('protocolo').value=d.protocolo;$('chave').value=d.novaChave;return 'Nova chave emitida. A anterior perdeu a validade.';
});
$('sessao').onclick=()=>executar(async()=>{
 const d=await api('admin/sessao/validar');
 if(d.mfaRecente!==true)throw Error('MFA não confirmado.');
 return 'MFA confirmado pela API candidata.';
});
$('listar').onclick=()=>executar(async()=>{
 $('pedidos').replaceChildren();
 const itens=await api('admin/recuperacao/listar');
 for(const p of itens){
  const bloco=document.createElement('p');bloco.textContent=p.protocolo+' · '+p.estado+' ';
  if(p.estado==='pendente')bloco.append(botao('Aprovar pedido fictício',async()=>{
   if(!confirm('Confirma que esta solicitação é fictícia e que conferiu o destino?'))return 'Aprovação cancelada.';
   await api('admin/recuperacao/decidir',{pedidoId:p.id,decisao:'aprovar',identidadeConferida:true,justificativa:'Conferência da identidade fictícia para homologação.'});
   return 'Pedido aprovado. Atualize a lista.';
  }));
  if(p.estado==='aprovado')bloco.append(botao('Gerar código',async()=>{
   const telefoneConfirmado=await pedirTelefone('Redigite o WhatsApp autorizado neste teste, com DDD');
   if(!telefoneConfirmado)return 'Emissão cancelada.';
   const r=await api('admin/recuperacao/emitir',{pedidoId:p.id,telefoneConfirmado});
   if(r.envioPermitido!==true||!/^\+55\d{11}$/.test(r.telefone))throw Error('Destino não confirmado.');
   const codigo=document.createElement('span');codigo.textContent=' Código de teste: '+r.codigo+' ';
   const enviar=document.createElement('a');enviar.textContent='Abrir WhatsApp para envio manual';
   enviar.rel='noreferrer';
   enviar.href='https://api.whatsapp.com/send?phone='+r.telefone.slice(1)+'&text='+encodeURIComponent(r.mensagem);
   enviar.onclick=e=>{if(Date.now()>=Date.parse(r.expiraEm)||!confirm('Confirme que este é seu próprio WhatsApp de teste.'))e.preventDefault();};
   const confirmar=botao('Confirmar envio manual',async()=>{
    if(!confirm('Você enviou o código ao seu número de teste?'))return 'Confirmação cancelada.';
    await api('admin/recuperacao/confirmar-envio',{pedidoId:p.id,envioConfirmado:true});return 'Envio manual registrado.';
   });
   if(r.telefone===padrao)bloco.replaceChildren(codigo);
   else bloco.replaceChildren(codigo,enviar,confirmar);
   setTimeout(()=>{codigo.remove();enviar.remove();confirmar.remove();},Math.max(0,Date.parse(r.expiraEm)-Date.now()));
   return 'Código gerado. O envio é manual.';
  }));
  $('pedidos').append(bloco);
 }
 return itens.length?'Pedidos fictícios carregados.':'Sem pedidos fictícios.';
});
const painel=location.pathname.endsWith('/painel');
$(painel?'painel':'cidadao').hidden=false;
if(painel){
 let ponto=null,mapa=null;
 const caixa=$('mapa-local'),abrir=$('abrir-local'),mostrar=$('mostrar-mapa');
 const limparMapa=()=>{mapa?.remover();mapa=null;caixa.hidden=true;};
 $('consultar-local').onclick=()=>executar(async()=>{
  limparMapa();ponto=null;abrir.hidden=true;abrir.removeAttribute('href');mostrar.hidden=true;
  $('origem-local').textContent='';
  const lista=$('anexos-admin');lista.replaceChildren();
  const protocolo=$('local-protocolo').value.trim();
  const resposta=await api('admin/solicitacoes/localizacao',{protocolo});
  for(const a of resposta.anexos)lista.append(botao('Baixar '+a.nome,async()=>{
   salvarAnexo(await api('admin/solicitacoes/baixar-anexo',{protocolo,arquivoId:a.id}));
   return 'Download privado autorizado pelo Painel.';
  }));
  if(!resposta.ponto)return resposta.anexos.length?'Anexos encontrados. Sem localização autorizada.':'Nenhuma localização autorizada ou anexo para este protocolo.';
  ponto=resposta.ponto;
  $('origem-local').textContent=ponto.origem==='gps'?'Origem: GPS autorizado':'Origem: marcação manual';
  const destino=encodeURIComponent(ponto.latitude+','+ponto.longitude);
  abrir.href='https://www.google.com/maps/search/?api=1&query='+destino;
  abrir.hidden=false;mostrar.hidden=false;
  return 'Localização encontrada.';
 });
 mostrar.onclick=()=>executar(async()=>{
  limparMapa();
  if(!ponto)return 'Consulte um protocolo primeiro.';
  if(!globalThis.L){
   const css=document.createElement('link');css.rel='stylesheet';css.href='/hml/v2/vendor/leaflet/leaflet.css';document.head.append(css);
   await new Promise((resolve,reject)=>{
    const script=document.createElement('script');script.src='/hml/v2/vendor/leaflet/leaflet.js';
    script.onload=resolve;script.onerror=()=>reject(Error('Mapa indisponível. Use o link para o aplicativo de mapas.'));
    document.head.append(script);
   });
  }
  const {montarMapaPrivado}=await import('/hml/v2/seguranca/localizacao-solicitacao-hml.mjs');
  caixa.style.height='320px';caixa.hidden=false;
  mapa=montarMapaPrivado(caixa,ponto);
  return 'Mapa exibido.';
 });
 addEventListener('pagehide',()=>{$('anexos-admin').replaceChildren();limparMapa();ponto=null;abrir.hidden=true;abrir.removeAttribute('href');mostrar.hidden=true;$('origem-local').textContent='';});
}

