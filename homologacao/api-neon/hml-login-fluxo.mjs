// Entrada administrativa exclusivamente homologada. Não guarda nem registra credenciais.
export function criarApiEntrada({buscar=globalThis.fetch,tempoLimite=15000}={}){
 return async(path,data)=>{
  const controle=new AbortController(),timer=setTimeout(()=>controle.abort(),tempoLimite);
  try{
   const r=await buscar('/hml'+path,{method:data===undefined?'GET':'POST',credentials:'same-origin',cache:'no-store',redirect:'error',signal:controle.signal,headers:data===undefined?{}:{'Content-Type':'application/json'},body:data===undefined?undefined:JSON.stringify(data)});
   let v;try{v=await r.json();}catch(e){if(controle.signal.aborted)throw e;throw Error('O serviço respondeu de forma inesperada. Tente novamente.');}
   if(!r.ok){
    if(r.status===429)throw Error('Muitas tentativas. Aguarde um minuto antes de tentar novamente.');
    if(path==='/auth/sign-in/email'&&[400,401].includes(r.status))throw Error('E-mail ou senha recusados. Confira os dados de homologação.');
    if(path==='/auth/two-factor/verify-totp'&&[400,401].includes(r.status))throw Error('Código do autenticador recusado ou expirado. Use o código atual.');
    if(r.status===403)throw Error('A sessão não foi confirmada neste aparelho. Entre novamente para continuar.');
    throw Error('Não foi possível concluir a operação. Tente novamente.');
   }
   return v;
  }catch(e){if(controle.signal.aborted)throw Error('O serviço demorou para responder. Não foi possível confirmar a entrada. Verifique a conexão e tente novamente.');if(e instanceof TypeError)throw Error('Não foi possível conectar. Verifique a internet e tente novamente.');throw e;}
  finally{clearTimeout(timer);}
 };
}
export function criarFluxoEntrada({api,aplicarEstado,mensagem,abrirPainel}){
 let aguardandoMfa=false,ultimo=null;
 async function atualizar(){ultimo=await api('/api/estado');aplicarEstado({...ultimo,aguardandoMfa});return ultimo;}
 return {
  atualizar,
  async entrar(d){mensagem('Verificando e-mail e senha…');aguardandoMfa=false;const r=await api('/auth/sign-in/email',d);aguardandoMfa=r.twoFactorRedirect===true;await atualizar();mensagem(aguardandoMfa?'E-mail e senha aceitos. Agora informe o código atual do autenticador.':'Entrada aceita. Configure ou confirme o MFA para continuar.');return aguardandoMfa;},
  async confirmar(d){if(!aguardandoMfa&&!ultimo?.autenticado)throw Error('Entre primeiro com e-mail e senha. Depois confirme o autenticador.');mensagem('Confirmando o código do autenticador…');await api('/auth/two-factor/verify-totp',{...d,trustDevice:false});aguardandoMfa=false;const e=await atualizar();if(!e.autenticado||!e.mfaRecente)throw Error('A sessão não foi confirmada neste aparelho. Entre novamente para continuar.');mensagem('Entrada confirmada. Abrindo o Painel do Mandato…');abrirPainel();},
  refazer(){aguardandoMfa=false;ultimo=null;aplicarEstado({autenticado:false,instalado:true,mfaAtivado:false,mfaRecente:false,aguardandoMfa:false});mensagem('Informe novamente e-mail e senha da homologação.');}
 };
}
