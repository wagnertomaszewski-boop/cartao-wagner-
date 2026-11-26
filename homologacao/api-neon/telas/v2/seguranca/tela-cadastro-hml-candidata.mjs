import {criarClienteCandidata,ativarMascaraTelefone} from './cliente-candidata.mjs';
import {criarSelecaoLocalizacao,montarMapaPrivado} from './localizacao-solicitacao-hml.mjs';
import {validarSelecaoArquivos,enviarArquivosPendentes} from './fotos-solicitacao-hml.mjs';
import {criarBuscaPrivada} from './biometria-cidadao.mjs';
import {criarClienteRecuperacaoManual} from './cliente-recuperacao-manual.mjs';
const $=id=>document.getElementById(id);let api,resultado=null,ocupado=false,cicloDaTela=0;const operacaoId=crypto.randomUUID();
const candidata=new URLSearchParams(location.search).get('api')==='candidata';
const buscar=criarBuscaPrivada((...args)=>fetch(...args),()=>cicloDaTela);
try{api=candidata?criarClienteCandidata(buscar):criarClienteRecuperacaoManual({origem:location.origin,buscar});}catch(e){$('mensagem').textContent=e.message;$('enviar').disabled=true;}
if(candidata){
 ativarMascaraTelefone(document.querySelector('[name=p_whatsapp]'));
 const campo=$('anexo'),rotulo=campo.closest('label');
 for(const parte of rotulo?.childNodes??[]){
  if(parte.nodeType===Node.TEXT_NODE&&parte.textContent.includes('10 MB'))
   parte.textContent=parte.textContent.replace('10 MB','1 MB');
 }
}
let pendentes=[],mapa=null,pontoPendente=null;const selecao=criarSelecaoLocalizacao();
const mostrarPonto=()=>{const p=selecao.ler();$('localizacao-estado').textContent=p?(p.localizacaoOrigem==='gps'?'GPS autorizado':'Ponto escolhido manualmente')+': '+p.latitude+', '+p.longitude:'Sem localização. O envio continua permitido.';};
async function anexarPendentes(){try{await enviarArquivosPendentes(pendentes,async f=>{const bytes=new Uint8Array(await f.arrayBuffer());let binario='';for(const b of bytes)binario+=String.fromCharCode(b);await api.anexar({protocolo:resultado.protocolo,chave:resultado.chaveInicial,nome:f.name,mime:f.type,base64:btoa(binario)});},()=>{$('estado-anexos').textContent='Anexos restantes: '+pendentes.length;});$('estado-anexos').textContent='Todos os anexos selecionados foram registrados de forma privada.';}catch(e){$('estado-anexos').textContent='Envio incompleto. Restam '+pendentes.length+' arquivo(s). '+e.message;}finally{$('reenviar-anexos').hidden=!pendentes.length;}}
$('cadastro').onsubmit=async e=>{e.preventDefault();if(!api||ocupado)return;ocupado=true;$('enviar').disabled=true;try{pendentes=validarSelecaoArquivos($('anexo').files);if(pendentes.some(f=>f.size>1048576))throw Error('A API candidata aceita arquivos de até 1 MB. Reduza a imagem e tente novamente.');const d=Object.fromEntries(new FormData(e.target)),ponto=selecao.ler();resultado=await api.cadastrar({...d,operacaoId,ficticio:d.ficticio==='on',whatsappRealAutorizado:d.whatsappRealAutorizado==='on',origem:location.pathname.startsWith('/hml/mandato/')?'mandato':'v2',...(ponto&&$('localizacao-autorizada').checked?{...ponto,localizacaoAutorizada:true}:{})});$('protocolo').textContent=resultado.protocolo;$('chave').value=resultado.chaveInicial;const link=$('acompanhar-solicitacao');if(link)link.href='/hml/v2/recuperar'+(candidata?'?api=candidata':'')+'#'+new URLSearchParams({protocolo:resultado.protocolo}).toString();$('resultado').hidden=false;$('cadastro').hidden=true;$('mensagem').textContent='Solicitação fictícia criada com acesso privado.';if(pendentes.length)await anexarPendentes();}catch(e){$('mensagem').textContent=e.message;}finally{ocupado=false;$('enviar').disabled=false;}};
$('reenviar-anexos').onclick=async()=>{if(ocupado||!resultado)return;ocupado=true;try{await anexarPendentes();}catch(e){$('mensagem').textContent=e.message;}finally{ocupado=false;}};
$('copiar').type='button';
$('copiar').textContent='Copiar chave';
const copiarProtocolo=document.createElement('button');
copiarProtocolo.type='button';copiarProtocolo.textContent='Copiar protocolo';
$('copiar').before(copiarProtocolo);
async function copiar(campo,rotulo){
 if(!resultado)return;
 try{await navigator.clipboard.writeText(resultado[campo]);$('mensagem').textContent=rotulo+' copiado para a área de transferência.';}
 catch{$('mensagem').textContent='Não foi possível copiar. Selecione o valor exibido e copie manualmente.';}
}
copiarProtocolo.onclick=()=>copiar('protocolo','Protocolo');
$('copiar').onclick=()=>copiar('chaveInicial','Código da chave');
function fecharMapa(){mapa?.remover();mapa=null;pontoPendente=null;$('mapa-selecao').hidden=true;}
addEventListener('pagehide',()=>{cicloDaTela++;resultado=null;pendentes=[];selecao.limpar();fecharMapa();$('chave').value='';$('anexo').value='';});
$('localizacao-autorizada').onchange=e=>{if(!e.target.checked){selecao.limpar();fecharMapa();mostrarPonto();}};
$('remover-localizacao').onclick=()=>{selecao.limpar();fecharMapa();mostrarPonto();};
$('marcar-mapa').onclick=()=>{if(!$('localizacao-autorizada').checked){$('localizacao-estado').textContent='Autorize compartilhar o ponto desta solicitação antes de abrir o mapa.';return;}try{fecharMapa();$('mapa-selecao').hidden=false;$('confirmar-ponto').disabled=true;mapa=montarMapaPrivado($('mapa-cadastro'),selecao.ler(),(latitude,longitude)=>{selecao.cancelarGps();pontoPendente={latitude,longitude};$('ponto-pendente').textContent='Ponto selecionado: '+latitude+', '+longitude;$('confirmar-ponto').disabled=false;});}catch(e){$('localizacao-estado').textContent=e.message;}};
$('confirmar-ponto').onclick=()=>{if(!pontoPendente||!$('localizacao-autorizada').checked)return;selecao.mapa(pontoPendente.latitude,pontoPendente.longitude);mostrarPonto();fecharMapa();};
$('fechar-mapa').onclick=fecharMapa;
$('capturar-localizacao').onclick=()=>{if(!$('localizacao-autorizada').checked){$('localizacao-estado').textContent='Confirme a autorização antes de solicitar a localização.';return;}if(!navigator.geolocation){$('localizacao-estado').textContent='GPS indisponível. Marque no mapa ou envie sem localização.';return;}const token=selecao.iniciarGps();$('localizacao-estado').textContent='Aguardando sua permissão para localização…';navigator.geolocation.getCurrentPosition(p=>{if(!$('localizacao-autorizada').checked)return;try{if(selecao.gps(token,p.coords))mostrarPonto();}catch(e){$('localizacao-estado').textContent=e.message;}},()=>{$('localizacao-estado').textContent='GPS não obtido ou não autorizado. O ponto anterior foi preservado. Marque no mapa ou envie sem localização.';},{enableHighAccuracy:true,maximumAge:0,timeout:15000});};
