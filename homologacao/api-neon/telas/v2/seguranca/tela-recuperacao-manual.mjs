import {criarAtualizacaoVisivel} from './atualizacao-visivel.mjs';
import {criarClienteBiometriaCidadao,criarBuscaPrivada} from './biometria-cidadao.mjs';
import {criarClienteRecuperacaoManual,formatarDataMandato,salvarArquivoLocal} from './cliente-recuperacao-manual.mjs';
const $=id=>document.getElementById(id);let api,pedido=null,nova=null,acesso=null,ocupado=false,cicloDaTela=0;
const biometria=criarClienteBiometriaCidadao(globalThis.MandatoCidadaoBiometria);
const atualizarBiometria=()=>{$('ativar-biometria-cidadao').disabled=!acesso||acesso.biometrico===true;};
try{api=criarClienteRecuperacaoManual({origem:location.origin,buscar:criarBuscaPrivada((...args)=>fetch(...args),()=>cicloDaTela)});}catch(e){$('mensagem').textContent=e.message;document.querySelectorAll('button').forEach(b=>b.disabled=true);}
async function agir(fn){if(!api||ocupado)return;ocupado=true;try{$('mensagem').textContent='';await fn();}catch(e){$('mensagem').textContent=e.message;}finally{ocupado=false;}}
function limpar(){cicloDaTela++;$('andamento').hidden=true;for(const id of ['assunto','situacao','descricao','localidade','historico','respostas','anexos'])$(id).replaceChildren();pedido=null;nova=null;acesso=null;$('qr-acompanhamento').removeAttribute('src');$('qr-acompanhamento').hidden=true;for(const id of ['chave','codigo','nova-chave','telefone'])$(id).value='';}
addEventListener('pagehide',()=>{atualizacao.parar();limpar();});
function render(r){$('qr-acompanhamento').hidden=true;$('qr-acompanhamento').removeAttribute('src');$('andamento').hidden=!r.encontrado;if(!r.encontrado)throw Error('Protocolo ou chave inválidos.');$('assunto').textContent=r.assunto||'Solicitação';$('situacao').textContent=(r.status||'Acompanhamento protegido')+' · versão '+r.versao;
 $('descricao').textContent=(r.descricao||'')+(r.resultado?' · Resultado: '+r.resultado:'');$('localidade').textContent=r.localidade||'';
 for(const id of ['historico','respostas','anexos'])$(id).replaceChildren();
 for(const h of r.historico||[]){const li=document.createElement('li');li.textContent=(h.criadoEm?formatarDataMandato(h.criadoEm)+' · ':'')+h.status;$('historico').append(li);}
 for(const a of r.anexos||[]){const li=document.createElement('li');li.textContent=a.nome+' · arquivo privado';if(a.id){const b=document.createElement('button');b.textContent='Baixar documento';b.onclick=()=>agir(async()=>{if(!acesso)throw Error('Consulte novamente com sua chave.');if(acesso.biometrico){biometria.operar('baixar',a.id);return;}const arquivo=await api.baixar({...acesso,arquivoId:a.id});salvarArquivoLocal(arquivo);});li.append(b);}$('anexos').append(li);}
 for(const resposta of r.respostas||[]){const p=document.createElement('p');p.textContent=resposta.mensagem;for(const a of resposta.anexos||[])p.append(document.createTextNode(' · '+a.nome+' (arquivo privado)'));$('respostas').append(p);}
}
$('consulta').onsubmit=e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.target));$('chave').value='';$('andamento').hidden=true;acesso=null;atualizarBiometria();void agir(async()=>{const r=await api.consultar(d);if(r.encontrado)acesso=d;else acesso=null;atualizarBiometria();render(r);});};
$('nav-recuperar').onclick=$('abrir-recuperacao').onclick=()=>{$('recuperacao').hidden=false;$('protocolo-rec').value=$('protocolo').value;$('protocolo-rec').focus();};
$('solicitar').onsubmit=e=>{e.preventDefault();void agir(async()=>{if(pedido)throw Error('Você já tem um pedido aberto nesta aba.');const d=Object.fromEntries(new FormData(e.target));pedido=await api.solicitar(d);$('telefone').value='';$('confirmacao').hidden=false;$('solicitar').hidden=true;$('mensagem').textContent='Se os dados corresponderem ao cadastro, a equipe analisará seu pedido. Aguarde o código enviado manualmente pelo WhatsApp.';});};
$('validar').onsubmit=e=>{e.preventDefault();const codigo=$('codigo').value;$('codigo').value='';void agir(async()=>{if(!pedido)throw Error('Solicite a recuperação primeiro.');const r=await api.validar({...pedido,codigo});if(!r.confirmado)throw Error('Código inválido, expirado, bloqueado ou já utilizado.');nova={protocolo:r.protocolo,chave:r.novaChave};pedido=null;$('confirmacao').hidden=true;$('recuperacao').hidden=true;$('nova-chave').value=r.novaChave;$('recuperado').hidden=false;$('mensagem').textContent='Acesso recuperado. Sua chave anterior não funciona mais.';});};
$('novo-pedido').onclick=()=>{pedido=null;$('confirmacao').hidden=true;$('solicitar').hidden=false;$('mensagem').textContent='Confira os dados para solicitar uma nova análise. A equipe precisa aprovar novamente.';};
$('copiar').onclick=()=>agir(async()=>{if(!nova)throw Error('Nenhuma chave disponível.');await navigator.clipboard.writeText(nova.chave);$('mensagem').textContent='Chave copiada. Guarde-a em local seguro.';});
$('consultar-nova').onclick=()=>agir(async()=>{if(!nova)throw Error('Nenhuma chave disponível.');render(await api.consultar(nova));acesso=nova;atualizarBiometria();$('protocolo').value=nova.protocolo;});

$('gerar-qr').onclick=()=>agir(async()=>{if(!acesso)throw Error('Consulte com protocolo e chave antes de gerar o QR.');if(acesso.biometrico){biometria.operar('qr');return;}const r=await api.gerarQr(acesso);if(!r.encontrado)throw Error('Acesso privado inválido.');$('qr-acompanhamento').src=r.qr;$('qr-acompanhamento').hidden=false;});
try{const p=new URLSearchParams(location.hash.slice(1)).get('protocolo');if(p&&p.length<=80)$('protocolo').value=p;}catch{}

$('confirmar-leitura').onclick=()=>agir(async()=>{if(!acesso)throw Error('Consulte com sua chave.');if(acesso.biometrico){biometria.operar('leitura');return;}await api.confirmarLeitura(acesso);$('mensagem').textContent='Leitura registrada. Isso não confirma entrega de mensagem pelo WhatsApp.';});

if(biometria){
 $('biometria-cidadao').hidden=false;
 $('ativar-biometria-cidadao').onclick=()=>agir(async()=>{biometria.ativar(acesso);$('estado-biometria-cidadao').textContent='Confirme no diálogo nativo do Android.';});
 $('consultar-biometria-cidadao').onclick=()=>{acesso=null;nova=null;$('nova-chave').value='';$('recuperado').hidden=true;$('andamento').hidden=true;atualizarBiometria();biometria.consultar();};
 $('desativar-biometria-cidadao').onclick=()=>biometria.desativar();
 addEventListener('mandato-biometria-cidadao',e=>{void agir(async()=>{const {tipo,resultado:r}=e.detail||{};if(tipo==='consulta'){if(r?.encontrado!==true)throw Error('Acesso privado inválido.');acesso={biometrico:true};atualizarBiometria();$('protocolo').value=r.protocolo||'';render(r);$('estado-biometria-cidadao').textContent='Biometria confirmada e acesso validado novamente pelo servidor.';}
  else if(tipo==='ativada')$('estado-biometria-cidadao').textContent='Acesso cifrado no aparelho por até 24 horas. A biometria não substitui a validação do servidor.';
  else if(tipo==='desativada'){acesso=null;$('andamento').hidden=true;atualizarBiometria();$('estado-biometria-cidadao').textContent='Acesso local removido. Consulte manualmente com protocolo e chave.';}
  else if(tipo==='erro'){if(acesso?.biometrico){acesso=null;$('andamento').hidden=true;atualizarBiometria();}$('estado-biometria-cidadao').textContent=r?.mensagem||'Use protocolo e chave para continuar.';}
  else if(tipo==='qr'){if(!r?.encontrado)throw Error('Acesso privado inválido.');$('qr-acompanhamento').src=r.qr;$('qr-acompanhamento').hidden=false;}
  else if(tipo==='arquivo-preparado')$('mensagem').textContent='Escolha onde salvar o arquivo privado no Android.';
  else if(tipo==='leitura')$('mensagem').textContent='Leitura registrada. Isso não confirma entrega de mensagem pelo WhatsApp.';
 });});
}

async function atualizarAndamento(){
 if(!acesso)throw Error('Consulte novamente com protocolo e chave.');
 if(acesso.biometrico){biometria.consultar();return;}
 const r=await api.consultar(acesso);
 if(!r.encontrado){limpar();atualizarBiometria();throw Error('Acesso expirado ou revogado. Consulte novamente com protocolo e chave.');}
 render(r);
}
$('atualizar-andamento').onclick=()=>agir(atualizarAndamento);
const atualizacao=criarAtualizacaoVisivel({atualizar:()=>agir(atualizarAndamento),podeAtualizar:()=>!ocupado&&!!acesso&&!acesso.biometrico&&!pedido&&!nova&&!document.activeElement?.matches('input,textarea,select'),visivel:()=>document.visibilityState==='visible'});
