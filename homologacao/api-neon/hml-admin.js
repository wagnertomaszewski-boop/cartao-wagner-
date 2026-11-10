import {criarApiEntrada,criarFluxoEntrada} from './login-fluxo.mjs';
const $=id=>document.getElementById(id),api=criarApiEntrada();let ocupado=false;
function mensagem(texto){$('mensagem').textContent=texto;$('feedback-login').textContent=texto;if(texto)$('feedback-login').scrollIntoView({block:'nearest'});}
function aplicarEstado(e){$('estado').textContent=e.autenticado?(e.mfaRecente?'Sessão administrativa confirmada com MFA recente.':'Sessão autenticada. Confirme o MFA para continuar.'):'Entre com sua conta exclusiva de homologação.';$('instalacao').hidden=e.instalado;$('sair').hidden=!e.autenticado;$('login').hidden=e.autenticado||e.aguardandoMfa;$('mfa').hidden=e.mfaRecente||(!e.autenticado&&!e.aguardandoMfa);$('ativar-mfa').hidden=!e.autenticado||e.mfaAtivado;$('verify').hidden=!e.aguardandoMfa&&(!e.autenticado||!e.mfaAtivado);$('refazer-login').hidden=!e.aguardandoMfa;$('operacoes').hidden=!e.mfaRecente;$('whatsapp').textContent=e.whatsappConfigurado?'WhatsApp de teste configurado.':'Envio manual disponível no painel de recuperação. Não usa Cloud API.';}
const fluxo=criarFluxoEntrada({api,aplicarEstado,mensagem,abrirPainel:()=>location.assign('/hml/painel/recuperacoes')});
const estado=()=>fluxo.atualizar();
const show=async fn=>{if(ocupado)return;ocupado=true;const botoes=[...document.querySelectorAll('button')];for(const b of botoes)b.disabled=true;try{mensagem('');await fn();}catch(e){mensagem(e.message);}finally{ocupado=false;for(const b of botoes)b.disabled=false;}};
function form(id,fn){$(id).addEventListener('submit',ev=>{ev.preventDefault();if(ocupado)return;const d=Object.fromEntries(new FormData(ev.target));void show(async()=>{try{await fn(d);}finally{for(const x of ev.target.querySelectorAll('input[type=password],input[autocomplete=one-time-code]'))x.value='';}});});}
$('refazer-login').onclick=()=>{if(ocupado)return;for(const id of ['senha','totp'])$(id).value='';fluxo.refazer();};
form('setup',async d=>{await api('/setup',d);$('mensagem').textContent='Conta isolada criada. Entre e configure o autenticador.';await estado();});
form('signin',async d=>{if(await fluxo.entrar(d))$('totp').focus();});
form('ativar-mfa',async d=>{const r=await api('/auth/two-factor/enable',{...d,method:'totp'});$('qr').src=r.qr;$('uri').value=r.totpURI;$('backup').value=r.backupCodes.join('\n');$('enrollment').hidden=false;$('verify').hidden=false;});
form('verify',async d=>{await fluxo.confirmar(d);$('enrollment').hidden=true;$('qr').removeAttribute('src');$('uri').value='';$('backup').value='';});
$('criar').onclick=()=>show(async()=>{const r=await api('/api/pedidos',{});$('pedido').value=r.id;$('pedido-cidadao').value=r.id;$('protocolo').value=r.protocolo;$('resultado').value=JSON.stringify(r,null,2);});
for(const action of ['aprovar','iniciar','concluir'])$(action).onclick=()=>show(async()=>{const id=$('pedido').value;if(!/^[0-9a-f-]{36}$/.test(id))throw Error('Informe um identificador válido');const r=await api('/api/pedidos/'+id+'/'+action,{});$('resultado').value=JSON.stringify(r,null,2);if(r.desafioId)$('desafio').value=r.desafioId;});
form('confirmar',async d=>{$('mensagem').textContent=(await api('/cidadao/confirmar',d)).confirmado?'WhatsApp confirmado. A recuperação pode ser concluída pelo administrador.':'Código inválido, expirado ou já utilizado.';});
form('consultar',async d=>{$('mensagem').textContent=(await api('/cidadao/consultar',d)).encontrado?'Chave válida para a solicitação fictícia.':'Nenhuma solicitação corresponde a essa chave.';});
$('auditoria').onclick=()=>show(async()=>{$('eventos').textContent=JSON.stringify((await api('/api/auditoria')).eventos,null,2);});
$('sair').onclick=()=>show(async()=>{await api('/auth/sign-out',{});location.reload();});
void show(estado);
