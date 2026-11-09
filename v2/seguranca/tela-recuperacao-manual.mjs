import {criarClienteRecuperacaoManual} from './cliente-recuperacao-manual.mjs';
const $=id=>document.getElementById(id);let api,pedido=null,nova=null,ocupado=false;
try{api=criarClienteRecuperacaoManual({origem:location.origin});}catch(e){$('mensagem').textContent=e.message;document.querySelectorAll('button').forEach(b=>b.disabled=true);}
async function agir(fn){if(!api||ocupado)return;ocupado=true;try{$('mensagem').textContent='';await fn();}catch(e){$('mensagem').textContent=e.message;}finally{ocupado=false;}}
function limpar(){pedido=null;nova=null;for(const id of ['chave','codigo','nova-chave','telefone'])$(id).value='';}
addEventListener('pagehide',limpar);
function render(r){$('andamento').hidden=!r.encontrado;if(!r.encontrado)throw Error('Protocolo ou chave inválidos.');$('assunto').textContent=r.assunto||'Solicitação';$('situacao').textContent=(r.status||'Acompanhamento protegido')+' · versão '+r.versao;
 $('descricao').textContent=r.descricao||'';$('localidade').textContent=r.localidade||'';
 for(const id of ['historico','respostas','anexos'])$(id).replaceChildren();
 for(const h of r.historico||[]){const li=document.createElement('li');li.textContent=(h.criadoEm?new Date(h.criadoEm).toLocaleString('pt-BR')+' · ':'')+h.status;$('historico').append(li);}
 for(const a of r.anexos||[]){const li=document.createElement('li');li.textContent=a.nome+' · arquivo privado';$('anexos').append(li);}
 for(const resposta of r.respostas||[]){const p=document.createElement('p');p.textContent=resposta.mensagem;for(const a of resposta.anexos||[])p.append(document.createTextNode(' · '+a.nome+' (arquivo privado)'));$('respostas').append(p);}
}
$('consulta').onsubmit=e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.target));$('chave').value='';$('andamento').hidden=true;void agir(async()=>{render(await api.consultar(d));});};
$('nav-recuperar').onclick=$('abrir-recuperacao').onclick=()=>{$('recuperacao').hidden=false;$('protocolo-rec').value=$('protocolo').value;$('protocolo-rec').focus();};
$('solicitar').onsubmit=e=>{e.preventDefault();void agir(async()=>{if(pedido)throw Error('Você já tem um pedido aberto nesta aba.');const d=Object.fromEntries(new FormData(e.target));pedido=await api.solicitar(d);$('telefone').value='';$('confirmacao').hidden=false;$('solicitar').hidden=true;$('mensagem').textContent='Se os dados corresponderem ao cadastro, a equipe analisará seu pedido. Aguarde o código enviado manualmente pelo WhatsApp.';});};
$('validar').onsubmit=e=>{e.preventDefault();const codigo=$('codigo').value;$('codigo').value='';void agir(async()=>{if(!pedido)throw Error('Solicite a recuperação primeiro.');const r=await api.validar({...pedido,codigo});if(!r.confirmado)throw Error('Código inválido, expirado, bloqueado ou já utilizado.');nova={protocolo:r.protocolo,chave:r.novaChave};pedido=null;$('confirmacao').hidden=true;$('recuperacao').hidden=true;$('nova-chave').value=r.novaChave;$('recuperado').hidden=false;$('mensagem').textContent='Acesso recuperado. Sua chave anterior não funciona mais.';});};
$('novo-pedido').onclick=()=>{pedido=null;$('confirmacao').hidden=true;$('solicitar').hidden=false;$('mensagem').textContent='Confira os dados para solicitar uma nova análise. A equipe precisa aprovar novamente.';};
$('copiar').onclick=()=>agir(async()=>{if(!nova)throw Error('Nenhuma chave disponível.');await navigator.clipboard.writeText(nova.chave);$('mensagem').textContent='Chave copiada. Guarde-a em local seguro.';});
$('consultar-nova').onclick=()=>agir(async()=>{if(!nova)throw Error('Nenhuma chave disponível.');render(await api.consultar(nova));$('protocolo').value=nova.protocolo;});
