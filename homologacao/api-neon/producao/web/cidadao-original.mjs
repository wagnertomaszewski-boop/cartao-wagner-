import {criarClienteWeb} from '../v2/seguranca/cliente.mjs';

const $=id=>document.getElementById(id);
const config=await fetch('./v2/seguranca/configuracao-publica.json',{cache:'no-store',redirect:'error'}).then(r=>{
 if(!r.ok)throw Error('Configuração indisponível.');
 return r.json();
});
const api=criarClienteWeb(config);
const mensagem=(id,classe,texto)=>{
 const alvo=$(id);
 alvo.className=classe;
 alvo.textContent=texto;
 alvo.style.display='block';
};
const valor=id=>$(id).value.trim();
const form=$('formSolicitacao');
if(form){
 let operacaoId=crypto.randomUUID();
 let cadastro=null;
 const botao=$('botaoEnviar');
 botao.disabled=false;
 form.addEventListener('submit',async evento=>{
  evento.preventDefault();
  if(botao.disabled)return;
  botao.disabled=true;
  try{
   const arquivo=$('anexo').files[0];
   if(arquivo&&(arquivo.size>1048576||!['image/png','image/jpeg','application/pdf'].includes(arquivo.type)))
    throw Error('Escolha uma foto PNG/JPEG ou PDF de até 1 MB.');
   cadastro??=await api.cadastrar({operacaoId,p_nome:valor('nome'),p_whatsapp:valor('whatsapp'),
    p_localidade:valor('localidade'),p_assunto:valor('assunto'),p_descricao:valor('descricao')});
   const identificacao='Protocolo: '+cadastro.protocolo+'\nChave: '+cadastro.chaveInicial;
   if(arquivo){
    try{
     const bytes=new Uint8Array(await arquivo.arrayBuffer());
     let binario='';
     for(const b of bytes)binario+=String.fromCharCode(b);
     await api.anexar({protocolo:cadastro.protocolo,chave:cadastro.chaveInicial,
      nome:arquivo.name,mime:arquivo.type,base64:btoa(binario)});
    }catch{
     mensagem('mensagem','erro','Solicitação registrada. Use o mesmo formulário para tentar enviar o anexo novamente.\n'+identificacao);
     return;
    }
   }
   mensagem('mensagem','sucesso','Guarde o protocolo e a chave para acompanhar.\n'+identificacao);
   cadastro=null;operacaoId=crypto.randomUUID();form.reset();
  }catch(e){mensagem('mensagem','erro',e.message);}
  finally{botao.disabled=false;}
 });
 addEventListener('pagehide',()=>{cadastro=null;$('mensagem').textContent='';});
}

if($('consultaPrivada')){
 let ocupado=false;
 const botoes=['consultaPrivada','pedirRecuperacao','validarRecuperacao'].map($);
 const executar=fn=>async()=>{
  if(ocupado)return;
  ocupado=true;
  for(const b of botoes)b.disabled=true;
  $('erro').style.display='none';
  try{await fn();}catch(e){mensagem('erro','erro',e.message);}
  finally{ocupado=false;for(const b of botoes)b.disabled=false;}
 };
 $('consultaPrivada').onclick=executar(async()=>{
  $('resultado').style.display='none';$('rAnexos').replaceChildren();
  const credencial={protocolo:valor('protocolo'),chave:valor('chavePrivada')};
  const r=await api.consultar(credencial);
  if(!r.encontrado)throw Error('Protocolo ou chave inválidos.');
  for(const [id,campo] of [['rProtocolo','protocolo'],['rStatus','status'],['rAssunto','assunto'],['rLocalidade','localidade']])
   $(id).textContent=r[campo]??'';
  $('rRespostas').replaceChildren(...(r.respostas??[]).map(item=>{
   const linha=document.createElement('p');linha.textContent=item.mensagem;return linha;
  }));
  for(const item of r.anexos??[]){
   const b=document.createElement('button');b.textContent='Baixar '+item.nome;
   b.onclick=executar(async()=>{
    const a=await api.baixar({protocolo:valor('protocolo'),chave:valor('chavePrivada'),arquivoId:item.id});
    const url=URL.createObjectURL(new Blob([Uint8Array.from(atob(a.base64),x=>x.charCodeAt(0))],{type:a.mime}));
    const link=document.createElement('a');link.href=url;link.download=a.nome;link.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
   });
   $('rAnexos').append(b);
  }
  $('resultado').style.display='block';
 });
 $('pedirRecuperacao').onclick=executar(async()=>{
  if(!valor('protocolo'))throw Error('Informe o protocolo.');
  await api.solicitarNavegador({protocolo:valor('protocolo'),telefone:valor('whatsappRecuperacao')});
  mensagem('estadoRecuperacao','sucesso','Se os dados corresponderem ao cadastro, o pedido será analisado. Volte neste navegador para validar o código.');
 });
 $('validarRecuperacao').onclick=executar(async()=>{
  const codigo=valor('codigoRecuperacao');$('codigoRecuperacao').value='';
  if(!/^\d{6}$/.test(codigo))throw Error('Informe o código de seis dígitos.');
  const r=await api.validarNavegador(codigo);
  if(r.reciboAusente)throw Error('Recibo indisponível. Use o navegador em que pediu a recuperação.');
  if(!r.validado)throw Error('Código inválido, expirado ou já utilizado.');
  $('protocolo').value=r.protocolo;$('chavePrivada').value=r.novaChave;
  mensagem('estadoRecuperacao','sucesso','Nova chave gerada. Use Mostrar chave para copiá-la e guardá-la.');
 });
 $('mostrarChave').onclick=()=>{
  const campo=$('chavePrivada');campo.type=campo.type==='password'?'text':'password';
  $('mostrarChave').textContent=campo.type==='password'?'Mostrar chave':'Ocultar chave';
 };
 for(const b of botoes)b.disabled=false;
 addEventListener('pagehide',()=>{
  for(const id of ['chavePrivada','codigoRecuperacao'])$(id).value='';
  $('chavePrivada').type='password';$('resultado').style.display='none';$('rAnexos').replaceChildren();
 });
}
