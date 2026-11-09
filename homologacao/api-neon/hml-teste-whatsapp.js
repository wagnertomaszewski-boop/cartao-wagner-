const $=id=>document.getElementById(id);
async function api(path,data){const r=await fetch('/hml'+path,{method:data===undefined?'GET':'POST',credentials:'same-origin',cache:'no-store',headers:data===undefined?{}:{'Content-Type':'application/json'},body:data===undefined?undefined:JSON.stringify(data)});const v=await r.json();if(!r.ok)throw Error(v.erro||'Operação indisponível');return v;}
const mostrar=async fn=>{try{$('mensagem').textContent='';await fn();}catch(e){$('mensagem').textContent=e.message;}};
let fixture=null,telefone=null,pedido=null,emissao=null,modoExpiracao=false,timer,novoPrazo;
const confere=()=>({identidadeConferida:$('identidade').checked,telefoneConfirmado:telefone});
function limparCodigo(){emissao=null;clearTimeout(timer);$('texto-whatsapp').value='';$('abrir').removeAttribute('href');$('abrir').hidden=true;$('destinatario').checked=false;}
function encerrar(){limparCodigo();clearTimeout(novoPrazo);telefone=null;fixture=null;pedido=null;for(const input of document.querySelectorAll('input'))input.value='';}
addEventListener('pagehide',encerrar);
async function estado(){const e=await api('/api/estado');$('cadastro').hidden=!e.mfaRecente||!!fixture;$('estado').textContent=e.mfaRecente?'Login e MFA recente confirmados. Informe seu número somente no formulário abaixo.':'Entre e confirme o MFA no link acima antes de cadastrar o teste.';}
async function solicitar(){pedido=await api('/manual/solicitar',{protocolo:fixture.protocolo,telefone});$('pedido').textContent=fixture.protocolo+' · Destino: '+fixture.telefoneMascarado;$('conferencia').hidden=false;$('identidade').checked=false;}
$('numero').onsubmit=ev=>{ev.preventDefault();void mostrar(async()=>{
 const d=Object.fromEntries(new FormData(ev.target));d.autorizoMeuNumero=$('autorizo').checked;
 if(d.telefone!==d.confirmacaoTelefone)throw Error('Os dois números precisam ser iguais');
 const novo=await api('/manual/fixture-pessoal',d);telefone=d.telefone;fixture=novo;ev.target.reset();$('cadastro').hidden=true;await solicitar();
 });};
for(const decisao of ['aprovar','rejeitar'])$(decisao).onclick=()=>mostrar(async()=>{
 await api('/manual/pedidos/'+pedido.pedidoId+'/decidir',{...confere(),decisao,justificativa:$('justificativa').value});
 $('conferencia').hidden=true;if(decisao==='rejeitar'){$('mensagem').textContent='Pedido rejeitado e auditado. Nenhum código foi liberado.';return;}
 $('geracao').hidden=false;$('mensagem').textContent='Aprovação auditada. Você já pode gerar o código.';
});
$('gerar').onclick=()=>mostrar(async()=>{
 limparCodigo();emissao=await api('/manual/pedidos/'+pedido.pedidoId+'/emitir',confere());$('geracao').hidden=true;$('envio').hidden=false;$('validacao').hidden=modoExpiracao;
 $('destino').textContent='Destinatário autorizado: '+fixture.telefoneMascarado;$('prazo').textContent='Válido até '+new Date(emissao.expiraEm).toLocaleTimeString('pt-BR')+'. Uso único.';$('texto-whatsapp').value=emissao.mensagem;
 if(modoExpiracao){$('mensagem').textContent='Teste de expiração em andamento. Mantenha esta aba aberta por cinco minutos. A validação será tentada após o prazo, sem envio automático de WhatsApp.';
  const copia=emissao,copiaPedido=pedido;timer=setTimeout(()=>void mostrar(async()=>{const r=await api('/manual/validar',{...copiaPedido,codigo:copia.codigo});limparCodigo();$('envio').hidden=true;$('resultado').hidden=false;$('expiracao').hidden=true;$('resumo').textContent=!r.confirmado?'Código recusado após o prazo. A expiração foi testada no servidor; confira a auditoria.':'Resultado inesperado: o código foi aceito após o prazo.';}),Math.max(0,new Date(emissao.expiraEm)-Date.now()+1000));
 }else timer=setTimeout(()=>{limparCodigo();$('envio').hidden=true;$('mensagem').textContent='O código expirou. A validação continua sujeita ao prazo do servidor.';},Math.max(0,new Date(emissao.expiraEm)-Date.now()));
});
$('preparar').onclick=()=>mostrar(async()=>{
 if(!emissao||!emissao.envioPermitido||!$('destinatario').checked)throw Error('Confirme o destinatário autorizado antes de abrir');
 if(Date.now()>=new Date(emissao.expiraEm))throw Error('Código expirado');const atual=emissao;
 await api('/manual/pedidos/'+pedido.pedidoId+'/abrir',{...confere(),desafioId:atual.desafioId});if(atual!==emissao)throw Error('Gere outro código');
 // Link somente em memória, usando URI privada do aplicativo. Sem URL pública/analytics.
 $('abrir').href='whatsapp://send?phone='+atual.telefone.slice(1)+'&text='+encodeURIComponent(atual.mensagem);$('abrir').hidden=false;
 $('mensagem').textContent='Toque no link para abrir o WhatsApp, confira o destinatário e envie manualmente. Entrega não confirmada.';
});
$('abrir').onclick=ev=>{if(!emissao||Date.now()>=new Date(emissao.expiraEm)){ev.preventDefault();$('mensagem').textContent='Código expirado';return;}setTimeout(()=>{$('abrir').removeAttribute('href');$('abrir').hidden=true;},0);};
$('validar').onsubmit=ev=>{ev.preventDefault();void mostrar(async()=>{
 const codigo=$('codigo').value;$('codigo').value='';if(!pedido)throw Error('Inicie o teste primeiro');
 const original={...pedido,codigo};const r=await api('/manual/validar',original);
 if(!r.confirmado){$('mensagem').textContent='Código inválido, expirado, bloqueado ou já utilizado.';return;}
 const recuperada=await api('/cidadao/consultar',{protocolo:r.protocolo,chave:r.novaChave});const repetido=await api('/manual/validar',original);limparCodigo();$('envio').hidden=true;$('validacao').hidden=true;$('resultado').hidden=false;
 // A chave recuperada não é impressa no relatório nem enviada ao chat.
 $('resumo').textContent=!repetido.confirmado&&recuperada.encontrado?'Código validado. A segunda tentativa foi recusada: uso único confirmado. A chave foi substituída e as operações foram auditadas.':'Falha: o código foi reutilizado.';
});};
$('expiracao').onclick=()=>mostrar(async()=>{
 modoExpiracao=true;limparCodigo();$('resultado').hidden=true;await solicitar();$('mensagem').textContent='Novo pedido fictício criado. Confirme o MFA novamente se necessário e aprove este ciclo para testar os cinco minutos.';
});
$('atualizar-sessao').onclick=()=>mostrar(estado);
void mostrar(estado);
