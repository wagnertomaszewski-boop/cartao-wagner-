function lerTelefone(valor) {
 const bruto=String(valor??'').trim();
 if(!/^\+?[\d\s().-]*$/.test(bruto))return null;
 const digitos=bruto.replace(/\D/g,'');
 const internacional=bruto.startsWith('+')||(!bruto.startsWith('(')&&digitos.length>11);
 if(!internacional)return {nacional:digitos,internacional};
 if(!digitos.startsWith('55'))return null;
 return {nacional:digitos.slice(2),internacional};
}

export function normalizarTelefoneRecuperacao(valor) {
 const nacional=lerTelefone(valor)?.nacional;
 if(!nacional||!/^[1-9]\d{9,10}$/.test(nacional))throw Error('Informe um WhatsApp brasileiro com DDD e número.');
 return '+55'+nacional;
}

export function mascararTelefone(valor) {
 const telefone=lerTelefone(valor);
 if(!telefone)return valor;
 const {nacional,internacional}=telefone;
 if(nacional.length>11||(internacional&&nacional.length<10))return valor;
 if(nacional.length<=2)return nacional;
 const ddd=nacional.slice(0,2),numero=nacional.slice(2);
 const prefixo=numero.length===9?5:4;
 return '('+ddd+') '+numero.slice(0,prefixo)+(numero.length>prefixo?'-'+numero.slice(prefixo):'');
}

export function ativarMascaraTelefone(campo) {
 if(!campo)return;
 campo.type='tel';
 campo.inputMode='tel';
 campo.placeholder='(51) 99999-9999';
 function formatar() {
  const anterior=campo.value;
  const novo=mascararTelefone(anterior);
  if(novo===anterior)return;
  const cursor=campo.selectionStart;
  const digitosApos=anterior.slice(cursor).replace(/\D/g,'').length;
  campo.value=novo;
  let posicao=novo.length,restantes=digitosApos;
  while(posicao>0&&restantes>0){
   if(/\d/.test(novo[--posicao]))restantes--;
  }
  campo.setSelectionRange(posicao,posicao);
 }
 campo.addEventListener('input',formatar);
 campo.addEventListener('change',formatar);
 formatar();
}

export function pedirTelefone(rotulo) {
 const dialogo=document.createElement('dialog');
 const form=document.createElement('form');
 const label=document.createElement('label');
 const campo=document.createElement('input');
 const cancelar=document.createElement('button');
 const confirmar=document.createElement('button');
 const aviso=document.createElement('p');
 label.textContent=rotulo+' ';
 campo.autocomplete='off';
 campo.required=true;
 ativarMascaraTelefone(campo);
 label.append(campo);
 aviso.setAttribute('role','alert');
 dialogo.className='autenticador-painel telefone-painel';
 dialogo.setAttribute('aria-label',rotulo);
 cancelar.type='button';
 cancelar.className='autenticador-fechar';
 cancelar.textContent='Cancelar';
 confirmar.type='submit';
 confirmar.className='autenticador-confirmar';
 confirmar.textContent='Confirmar número';
 form.append(label,aviso,confirmar,cancelar);
 dialogo.append(form);
 document.body.append(dialogo);
 return new Promise(resolve=>{
  let telefone=null;
  cancelar.onclick=()=>dialogo.close();
  campo.addEventListener('input',()=>{aviso.textContent='';});
  form.addEventListener('submit',evento=>{
   evento.preventDefault();
   try{telefone=normalizarTelefoneRecuperacao(campo.value);}
   catch(erro){aviso.textContent=erro.message;campo.focus();return;}
   dialogo.close();
  });
  const sair=()=>dialogo.close();
  addEventListener('pagehide',sair,{once:true});
  dialogo.addEventListener('close',()=>{
   removeEventListener('pagehide',sair);
   campo.value='';
   dialogo.remove();
   resolve(telefone);
  },{once:true});
  dialogo.showModal();
 });
}
