import {ativarMascaraTelefone} from './telefone.mjs';
import {criarClienteWeb,criarContratoRecuperacaoCidadao} from './cliente.mjs';
import {criarSelecaoLocalizacao,montarMapaPrivado} from './localizacao.mjs';
import {validarSelecaoArquivos,criarVisualizadorFotos,prepararAnexo} from './fotos.mjs';
const $=id=>document.getElementById(id);let ciclo=0,acesso=null,cadastro=null,pendentes=[],operacaoId=crypto.randomUUID(),ocupado=false,mapa=null,ponto=null;
const config=await fetch('./seguranca/configuracao-publica.json',{cache:'no-store',redirect:'error'}).then(r=>{if(!r.ok)throw Error('Configuração indisponível.');return r.json();});
ativarMascaraTelefone($('whatsapp'));
ativarMascaraTelefone($('whatsappRecuperacaoV2'));
const api=criarClienteWeb(config,async(...args)=>{const inicio=ciclo,r=await fetch(...args);if(inicio!==ciclo)throw Error('Tela encerrada. Informe novamente os dados.');return r;});
const acompanhamento=criarContratoRecuperacaoCidadao(api);
const avisar=(id,t)=>{const el=$(id);el.className='notice';el.style.display='block';el.textContent=t;};
const selecao=criarSelecaoLocalizacao();
const galeria=criarVisualizadorFotos($('rListaAnexosSeguros'),id=>{if(!acesso)throw Error('Consulte novamente.');return api.baixar({...acesso,arquivoId:id});});
$('segurancaV2').style.display='block';$('chaveConsultaV2').maxLength=43;
const camera=document.createElement('input');camera.type='file';camera.accept='image/jpeg,image/png';camera.setAttribute('capture','environment');camera.id='fotoCamera';const cameraLabel=document.createElement('label');cameraLabel.htmlFor=camera.id;cameraLabel.textContent='Tirar fotografia pela câmera';$('anexo').parentElement.append(cameraLabel,camera);
const local=document.createElement('section');local.className='card';local.innerHTML='<strong>Localização do problema (opcional)</strong><p class="muted">Autorize o GPS ou escolha o ponto no mapa. Você também pode enviar sem localização.</p><button type="button" id="usarGpsPrivado">Usar localização atual</button> <button type="button" id="mapaPrivado">Marcar no mapa</button> <button type="button" id="semLocalizacao">Remover ponto</button><p id="estadoLocal" role="status">Sem localização</p><div id="mapaEscolha" style="height:310px" hidden></div><button type="button" id="confirmarMapa" hidden>Confirmar ponto escolhido</button>';$('localidade').after(local);
const estado=()=>{const p=selecao.ler();$('estadoLocal').textContent=p?(p.localizacaoOrigem==='gps'?'GPS autorizado':'Ponto manual')+': '+p.latitude+', '+p.longitude:'Sem localização; o envio continua permitido.';};
$('usarGpsPrivado').onclick=()=>{if(!navigator.geolocation){avisar('mensagem','GPS indisponível; use o mapa ou envie sem localização.');return;}const token=selecao.iniciarGps();navigator.geolocation.getCurrentPosition(p=>{if(selecao.gps(token,p.coords))estado();},()=>{$('estadoLocal').textContent='Permissão negada ou GPS indisponível. Marque no mapa ou envie sem localização.';},{enableHighAccuracy:true,maximumAge:0,timeout:15000});};
$('mapaPrivado').onclick=()=>{mapa?.remover();$('mapaEscolha').hidden=false;$('confirmarMapa').hidden=false;$('confirmarMapa').disabled=true;try{mapa=montarMapaPrivado($('mapaEscolha'),selecao.ler(),(latitude,longitude)=>{selecao.cancelarGps();ponto={latitude,longitude};$('confirmarMapa').disabled=false;});}catch(e){$('estadoLocal').textContent=e.message;}};
$('confirmarMapa').onclick=()=>{if(!ponto)return;selecao.mapa(ponto.latitude,ponto.longitude);estado();mapa?.remover();mapa=null;ponto=null;$('mapaEscolha').hidden=true;$('confirmarMapa').hidden=true;};
$('semLocalizacao').onclick=()=>{selecao.limpar();ponto=null;mapa?.remover();mapa=null;$('mapaEscolha').hidden=true;$('confirmarMapa').hidden=true;estado();};
const recibo=document.createElement('div');recibo.className='card';recibo.hidden=true;recibo.innerHTML='<strong id="protocoloEmitido"></strong><label for="chaveEmitida">Chave individual de acompanhamento</label><input id="chaveEmitida" readonly autocomplete="off"><p>Guarde o protocolo e esta chave em local seguro. O código de recuperação de seis dígitos é temporário e não substitui esta chave.</p><button type="button" id="repetirAnexos" hidden>Reenviar anexos pendentes</button>';$('formSolicitacao').after(recibo);
const progresso=document.createElement('progress');progresso.hidden=true;progresso.setAttribute('aria-label','Arquivos enviados');recibo.append(progresso);
async function anexar(){
 if(!pendentes.length)return;
 progresso.hidden=false;progresso.max=pendentes.length;progresso.value=0;
 while(pendentes.length){
  const arquivo=pendentes[0];avisar('mensagem','Preparando '+arquivo.name+'…');
  const anexo=await prepararAnexo(arquivo);
  avisar('mensagem','Enviando arquivo '+(progresso.value+1)+' de '+progresso.max+'…');
  await api.anexar({...acesso,...anexo});
  pendentes.shift();progresso.value++;
 }
 $('repetirAnexos').hidden=true;avisar('mensagem','Todos os arquivos foram enviados.');
}
$('repetirAnexos').onclick=async()=>{if(ocupado)return;ocupado=true;try{await anexar();avisar('mensagem','Fotografias registradas de forma privada.');}catch(e){avisar('mensagem',e.message);}finally{ocupado=false;}};
$('formSolicitacao').onsubmit=async e=>{e.preventDefault();if(ocupado)return;ocupado=true;$('botaoEnviar').disabled=true;try{pendentes=validarSelecaoArquivos([...$('anexo').files,...camera.files]);const p=selecao.ler(),cat=document.querySelector('.cat.active')?.dataset.cat||'';cadastro=await api.cadastrar({operacaoId,p_nome:$('nome').value,p_whatsapp:$('whatsapp').value,p_localidade:$('localidade').value,p_assunto:(cat?cat+' — ':'')+$('assunto').value,p_descricao:$('descricao').value,...(p?{...p,localizacaoAutorizada:true}:{})});acesso={protocolo:cadastro.protocolo,chave:cadastro.chaveInicial};$('protocoloEmitido').textContent='Protocolo: '+acesso.protocolo;$('chaveEmitida').value=acesso.chave;recibo.hidden=false;avisar('mensagem','Solicitação registrada. Guarde protocolo e chave.');try{await anexar();}catch(e){$('repetirAnexos').hidden=false;avisar('mensagem','Solicitação salva. Há anexos pendentes; use Reenviar anexos pendentes.');}if(!pendentes.length){e.target.reset();selecao.limpar();operacaoId=crypto.randomUUID();}}catch(e){avisar('mensagem',e.message);}finally{ocupado=false;$('botaoEnviar').disabled=false;}};
function linhas(container,itens,texto){container.replaceChildren();for(const item of itens){const p=document.createElement('p');p.textContent=texto(item);container.append(p);}}
function documento(f){const b=document.createElement('button');b.type='button';b.textContent='Baixar '+f.nome;b.onclick=async()=>{try{if(!acesso)throw Error('Consulte novamente.');const r=await api.baixar({...acesso,arquivoId:f.id}),bytes=Uint8Array.from(atob(r.base64),c=>c.charCodeAt(0)),url=URL.createObjectURL(new Blob([bytes],{type:r.mime})),a=document.createElement('a');a.href=url;a.download=r.nome;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}catch(e){avisar('erro',e.message);}};$('rListaAnexosSeguros').append(b);}
async function consultar(){galeria.limpar();$('resultado').classList.remove('show');try{const d={protocolo:$('protocolo').value.trim(),chave:$('chaveConsultaV2').value.trim()};const r=await acompanhamento.consultar(d);if(!r.encontrado)throw Error('Protocolo ou chave inválidos.');acesso=d;$('rProtocolo').textContent=r.protocolo;$('rStatus').textContent=r.status;$('rAssunto').textContent=r.assunto;$('rSolicitante').textContent='Acesso privado';$('rLocalidade').textContent='Protegida';linhas($('timeline'),r.historico||[],x=>x.status+' — '+new Date(x.criadoEm).toLocaleString('pt-BR'));linhas($('rRespostas'),r.respostas||[],x=>x.mensagem+' — '+new Date(x.criadoEm).toLocaleString('pt-BR'));for(const f of r.anexos||[]){if(['image/png','image/jpeg'].includes(f.mime))galeria.adicionar(f);else documento(f);}$('rAnexosSeguros').style.display=r.anexos?.length?'block':'none';$('resultado').classList.add('show');}catch(e){acesso=null;avisar('erro',e.message);}finally{$('chaveConsultaV2').value='';}}
$('consultar').onclick=consultar;$('protocolo').onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();void consultar();}};
const ajudaPrimeiroAcesso=document.createElement('p');ajudaPrimeiroAcesso.className='muted';ajudaPrimeiroAcesso.textContent='Tem um protocolo antigo e nunca recebeu chave? Utilize Primeiro acesso. A equipe fará a conferência e poderá enviar manualmente um código ao WhatsApp cadastrado. Nenhuma solicitação será revelada apenas pelo protocolo.';$('abrirRecuperacaoV2').insertAdjacentElement('beforebegin',ajudaPrimeiroAcesso);$('abrirRecuperacaoV2').textContent='Primeiro acesso ou perdi minha chave';$('abrirRecuperacaoV2').onclick=()=>{$('recuperacaoV2').style.display='block';};
function mostrarRecuperacaoPeloLink(){
 if(location.hash==='#recuperacaoV2')$('recuperacaoV2').style.display='block';
}
addEventListener('hashchange',mostrarRecuperacaoPeloLink);
mostrarRecuperacaoPeloLink();
const validacao=document.createElement('div');validacao.hidden=false;validacao.innerHTML='<label for="codigoTemporario">Código temporário recebido</label><input id="codigoTemporario" inputmode="numeric" autocomplete="one-time-code" maxlength="6"><button id="validarTemporario" type="button">Validar e renovar chave</button><label for="novaChave">Nova chave de acompanhamento</label><input id="novaChave" readonly autocomplete="off">';$('recuperacaoV2').append(validacao);
$('enviarRecuperacaoV2').onclick=async()=>{try{await api.solicitarNavegador({protocolo:$('protocolo').value.trim(),telefone:$('whatsappRecuperacaoV2').value});validacao.hidden=false;avisar('erro','Se os dados corresponderem ao cadastro, o pedido será analisado pela equipe.');}catch(e){avisar('erro',e.message);}};
$('validarTemporario').onclick=async()=>{try{const r=await api.validarNavegador($('codigoTemporario').value);if(r.reciboAusente)throw Error('Recibo indisponível neste navegador. Use o mesmo navegador em que pediu a recuperação.');if(r.validado!==true)throw Error('Código inválido, expirado ou já utilizado.');$('protocolo').value=r.protocolo;$('novaChave').value=r.novaChave;avisar('erro','Guarde sua chave individual. Se existia uma chave anterior, ela foi invalidada.');}catch(e){avisar('erro',e.message);}finally{$('codigoTemporario').value='';}};
function limpar(){ciclo++;acesso=null;cadastro=null;pendentes=[];galeria.limpar();for(const id of ['chaveEmitida','novaChave','chaveConsultaV2','codigoTemporario'])$(id).value='';$('resultado').classList.remove('show');}
addEventListener('pagehide',limpar);addEventListener('pageshow',e=>{if(e.persisted)limpar();});
if('serviceWorker'in navigator)navigator.serviceWorker.register('./service-worker-privado.js',{scope:'./',updateViaCache:'none'}).then(r=>r.update()).catch(()=>{});
for(const id of ['botaoEnviar','consultar'])$(id).disabled=false;
avisar('mensagem','Preencha sua solicitação. A localização é opcional.');
