// Adaptador de envio via API oficial WhatsApp Business Cloud.
// Requer token de acesso, phone number ID e template de autenticação aprovados pela Meta.
// O código jamais é registrado em logs ou devolvido ao navegador.
export function criarEnvioWhatsappCloud({token,phoneNumberId,templateName,idioma='pt_BR',fetchImpl=fetch}={}){
 if(!token||!/^[0-9]{6,25}$/.test(String(phoneNumberId))||
  !/^[a-z][a-z0-9_]{2,100}$/.test(String(templateName))||
  typeof fetchImpl!=='function')throw Error('Credenciais e template oficial do WhatsApp obrigatórios');
 return async function enviarCodigo({telefone,codigo}={}){
  if(!/^\+55[1-9][0-9]{10}$/.test(String(telefone))||!/^[0-9]{6}$/.test(String(codigo)))
   throw Error('Destino ou código inválido');
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),8000);
  try{
   const r=await fetchImpl('https://graph.facebook.com/v22.0/'+phoneNumberId+'/messages',{
    method:'POST',signal:controller.signal,
    headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
    body:JSON.stringify({messaging_product:'whatsapp',to:telefone.slice(1),type:'template',
     template:{name:templateName,language:{code:idioma},components:[{type:'body',parameters:[{type:'text',text:codigo}]}]}})
   });
   if(!r.ok)return false;
   const resposta=await r.json();
   // Aceite pelo provedor não significa entrega efetiva ao aparelho.
   return Array.isArray(resposta.messages)&&typeof resposta.messages[0]?.id==='string';
  }finally{clearTimeout(timeout);}
 };
}
