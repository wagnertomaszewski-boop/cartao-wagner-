import {criarClienteWeb} from './cliente.mjs';
import {criarMfaWeb} from './mfa-web.mjs';
const config=await fetch('../v2/seguranca/configuracao-publica.json',{cache:'no-store',redirect:'error'}).then(r=>r.json());const api=criarClienteWeb(config);let limparEnvio=null;
const box=document.createElement('section');box.className='card';box.innerHTML='<h2>Recuperação privada de acompanhamento</h2><p>Confira a identidade antes de aprovar. Aprovação e emissão exigem MFA recente.</p><button type="button" id="atualizarRecPrivada">Atualizar pedidos de recuperação</button><p id="estadoRecPrivada" role="status"></p><div id="listaRecPrivada"></div>';document.querySelector('main')?.prepend(box);
const $=id=>document.getElementById(id);async function token(){if(tokenMfa)return tokenMfa;const s=await window.obterSessaoValida();if(!s?.access_token)throw Error('Entre novamente e confirme o MFA.');return s.access_token;}
const mfaBotao=document.createElement('button');mfaBotao.type='button';mfaBotao.textContent='Confirmar MFA administrativo';box.insertBefore(mfaBotao,$('estadoRecPrivada'));
let tokenMfa=null,fatorPendente=null;window.mandatoTokenMfaNativo=()=>tokenMfa;window.mandatoLimparMfaNativo=()=>{tokenMfa=null;};const mfa=criarMfaWeb({projeto:config.projeto,chavePublica:window.MANDATO_CHAVE_PUBLICA,obterToken:token});
const configurar=document.createElement('button');configurar.type='button';configurar.textContent='Configurar meu autenticador';box.insertBefore(configurar,$('estadoRecPrivada'));
const dialogo=document.createElement('dialog'),tituloMfa=document.createElement('h3'),avisoMfa=document.createElement('p'),qrMfa=document.createElement('img'),codigoMfa=document.createElement('input'),validarMfa=document.createElement('button'),fecharMfa=document.createElement('button');
tituloMfa.textContent='Autenticador administrativo';avisoMfa.textContent='No seu autenticador, leia o QR e confirme o código. Não compartilhe esta imagem. A configuração só fica válida após confirmar.';qrMfa.alt='QR privado de configuração do autenticador';qrMfa.style.maxWidth='min(75vw,300px)';codigoMfa.type='password';codigoMfa.inputMode='numeric';codigoMfa.autocomplete='one-time-code';codigoMfa.maxLength=6;codigoMfa.setAttribute('aria-label','Código do aplicativo autenticador');validarMfa.type='button';validarMfa.textContent='Confirmar código do autenticador';fecharMfa.type='button';fecharMfa.textContent='Fechar configuração';dialogo.append(tituloMfa,avisoMfa,qrMfa,codigoMfa,validarMfa,fecharMfa);document.body.append(dialogo);
function limparMfa(){qrMfa.removeAttribute('src');codigoMfa.value='';fatorPendente=null;}dialogo.addEventListener('close',limparMfa);fecharMfa.onclick=()=>dialogo.close();
async function abrirMfa(cadastrar){await executar(async()=>{if(cadastrar&&!confirm('Você quer cadastrar seu autenticador nesta conta administrativa? Não substituiremos um fator já verificado.'))return;const r=await mfa.preparar({confirmado:cadastrar});fatorPendente=r.id;qrMfa.hidden=r.jaConfigurado;if(r.imagem)qrMfa.src=r.imagem;avisoMfa.textContent=r.jaConfigurado?'Informe o código atual do seu autenticador.':'Leia o QR no seu autenticador e confirme o código. Não compartilhe esta imagem.';dialogo.showModal();});}
configurar.onclick=()=>abrirMfa(true);
mfaBotao.onclick=()=>executar(async()=>{const t=await token(),r=await fetch('https://'+config.projeto+'.supabase.co/auth/v1/user',{headers:{apikey:window.MANDATO_CHAVE_PUBLICA,Authorization:'Bearer '+t},cache:'no-store',redirect:'error',signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('Faça login novamente.');const u=await r.json(),f=(u.factors||[]).find(x=>x.factor_type==='totp'&&x.status==='verified');if(!f)throw Error('Use Configurar meu autenticador para concluir o cadastramento inicial.');fatorPendente=f.id;qrMfa.hidden=true;qrMfa.removeAttribute('src');avisoMfa.textContent='Informe o código atual do seu autenticador.';dialogo.showModal();});
validarMfa.onclick=()=>executar(async()=>{validarMfa.disabled=true;try{const r=await mfa.confirmar({id:fatorPendente,codigo:codigoMfa.value});await api.validarSessaoAdmin(r.token);tokenMfa=r.token;dialogo.close();$('estadoRecPrivada').textContent='MFA confirmado. O servidor continua exigindo TOTP recente para aprovação e emissão.';}finally{codigoMfa.value='';validarMfa.disabled=false;}});
addEventListener('pagehide',()=>{if(dialogo.open)dialogo.close();limparMfa();});
async function executar(fn){try{await fn();}catch(e){tokenMfa=null;$('estadoRecPrivada').textContent=e.message;}}
function botao(nome,acao){const b=document.createElement('button');b.type='button';b.textContent=nome;b.onclick=()=>executar(acao);return b;}
function numeroHistoricoSemNonoDigito(s){
 const digitos=String(s||'').replace(/\D/g,'');
 return digitos.length===10||(digitos.startsWith('55')&&digitos.length===12);
}
async function regularizarTelefoneHistorico(pedido){
 if(!confirm('Este número histórico não permite presumir o nono dígito. Você já verificou a identidade e solicitou uma comprovação independente da posse do NOVO WhatsApp?'))return;
 const telefoneNovo=prompt('Digite o novo celular com DDD e nono dígito, preferencialmente +55:');
 if(!telefoneNovo)return;
 const telefoneConfirmado=prompt('Redigite o novo celular completo para conferir o destinatário:');
 if(!telefoneConfirmado)return;
 const justificativa=prompt('Registre como a identidade foi conferida (mínimo de 20 caracteres; sem documentos, códigos ou outros dados pessoais):');
 if(!justificativa||justificativa.trim().length<20)throw Error('Justificativa de pelo menos 20 caracteres obrigatória.');
 const resultado=await api.admin('regularizar-contato',{
  pedidoId:pedido.id,telefoneNovo,telefoneConfirmado,justificativa,
  identidadeConferida:true,contatoVerificado:true
 },await token());
 // O servidor exige prova Ed25519 independente: estas declarações não a substituem.
 if(resultado?.regularizado!==true)throw Error('Regularização não confirmada pelo servidor.');
 $('estadoRecPrivada').textContent='Comprovante independente aceito para este pedido. Destino: '+resultado.destinoMascarado+'. Atualize a lista antes de gerar o código.';
}

$('atualizarRecPrivada').onclick=()=>executar(async()=>{limparEnvio?.();$('listaRecPrivada').replaceChildren();const rows=await api.admin('listar',{},await token());for(const r of rows){const item=document.createElement('article'),titulo=document.createElement('p');titulo.textContent=r.protocolo+' — '+r.whatsapp+' — '+r.estado;item.append(titulo);
 if(r.estado==='pendente')for(const decisao of ['aprovar','rejeitar'])item.append(botao(decisao==='aprovar'?'Aprovar recuperação':'Rejeitar recuperação',async()=>{if(!confirm('Você conferiu a identidade do solicitante e o telefone cadastrado?'))return;const justificativa=prompt('Informe a justificativa da decisão:');if(!justificativa?.trim())return;await api.admin('decidir',{pedidoId:r.id,decisao,identidadeConferida:true,justificativa},await token());$('estadoRecPrivada').textContent='Decisão registrada. Atualize a lista.';}));
 if(r.estado==='aprovado'&&numeroHistoricoSemNonoDigito(r.whatsapp)&&r.contato_regularizado!==true){
  if(r.regularizacao_configurada===true)
   item.append(botao('Regularizar celular antigo (prova independente)',()=>regularizarTelefoneHistorico(r)));
  else {
   const aviso=document.createElement('p');
   aviso.textContent='Número antigo: a regularização ainda depende de um verificador independente habilitado. Não gere código nem presuma o nono dígito.';
   aviso.setAttribute('role','status');
   item.append(aviso);
  }
 }
 if(r.estado==='aprovado'&&r.contato_regularizado===true){const info=document.createElement('p');info.textContent='Contato histórico regularizado com comprovante verificado neste pedido.';item.append(info);}
 if(r.estado==='aprovado'&&(!numeroHistoricoSemNonoDigito(r.whatsapp)||r.contato_regularizado===true)){
  const gerar=botao('Gerar código temporário',async()=>{
   const telefoneConfirmado=prompt(r.contato_regularizado===true
    ?'Confirme o novo WhatsApp comprovado para este pedido, com DDD:'
    :'Confirme o telefone cadastrado, com DDD:');
   if(!telefoneConfirmado)return;
   gerar.disabled=true;
   try{
    const emissao=await api.admin('emitir',{pedidoId:r.id,telefoneConfirmado},await token());
    if(!item.isConnected)return;
    const expira=Date.parse(emissao.expiraEm);
    if(emissao.envioPermitido!==true||!/^\+55[1-9][0-9]{10}$/.test(emissao.telefone)||
     !Number.isFinite(expira)||expira<=Date.now()||typeof emissao.mensagem!=='string')
     throw Error('O servidor não confirmou um destino e código válidos.');
    limparEnvio?.();
    const enviar=botao('Enviar código pelo WhatsApp',()=>{
     if(Date.now()>=expira){limpar();return;}
     if(!confirm('Confira o destinatário '+emissao.telefone+' antes de abrir o WhatsApp.'))return;
     location.assign('whatsapp://send?phone='+encodeURIComponent(emissao.telefone.slice(1))+
      '&text='+encodeURIComponent(emissao.mensagem));
     confirmar.disabled=false;
     $('estadoRecPrivada').textContent='Confira o destinatário no WhatsApp e toque em Enviar.';
    });
    const confirmar=botao('Confirmar que enviei manualmente',async()=>{
     if(!confirm('Você tocou em Enviar na conversa do destinatário correto?'))return;
     confirmar.disabled=true;
     try{
      await api.admin('confirmar-envio',{pedidoId:r.id,envioConfirmado:true},await token());
      limpar();
      $('estadoRecPrivada').textContent='Envio manual registrado. A entrega pelo WhatsApp ainda precisa ser conferida.';
     }finally{confirmar.disabled=false;}
    });
    confirmar.disabled=true;
    const timer=setTimeout(()=>limpar(),Math.max(0,expira-Date.now()));
    function limpar(){
     clearTimeout(timer);
     enviar.remove();
     confirmar.remove();
     if(limparEnvio===limpar)limparEnvio=null;
    }
    limparEnvio=limpar;
    gerar.replaceWith(enviar,confirmar);
   }finally{gerar.disabled=false;}
  });
  item.append(gerar);
 }
 $('listaRecPrivada').append(item);}});
addEventListener('pagehide',()=>{tokenMfa=null;limparEnvio?.();$('listaRecPrivada').replaceChildren();});
// Documentos antigos passam por sessão administrativa; nunca reabrir URL pública.
window.abrirDocumentoRespostaPrivado=async function(caminho){await executar(async()=>{const s=await token();const url='https://'+config.projeto+'.supabase.co/storage/v1/object/authenticated/documentos-respostas/'+String(caminho).split('/').map(encodeURIComponent).join('/');const r=await fetch(url,{headers:{Authorization:'Bearer '+s,apikey:window.MANDATO_CHAVE_PUBLICA},cache:'no-store',redirect:'error'});if(!r.ok)throw Error('Entre novamente para abrir o documento.');const blob=await r.blob(),href=URL.createObjectURL(blob),a=document.createElement('a');a.href=href;a.download=String(caminho).split('/').pop();a.click();setTimeout(()=>URL.revokeObjectURL(href),1000);});};
