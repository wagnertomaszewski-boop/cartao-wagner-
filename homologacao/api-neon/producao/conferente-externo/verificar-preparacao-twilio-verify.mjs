// Pré-verificação somente de leitura, executada antes de iniciar verificação paga.
// Sem credenciais, remetente WhatsApp ou CustomCode -> nenhuma mensagem é tentada.
// O retorno nunca contém os SIDs, o número remetente ou as credenciais.
const SERVICE=/^VA[0-9a-fA-F]{32}$/;
const APIKEY=/^SK[0-9a-fA-F]{32}$/;
const MESSAGING=/^MG[0-9a-fA-F]{32}$/;
const REMETENTE=/^whatsapp:\+[1-9]\d{7,14}$/;

/**
 * @param {{serviceSid:string,apiKeySid:string,apiKeySecret:string,
 * requisitar?:(url:string,options:any)=>Promise<any>,timeoutMs?:number}} config
 */
export function criarVerificadorPreparacaoTwilioVerify({
 serviceSid,apiKeySid,apiKeySecret,requisitar=fetch,timeoutMs=15000
}={}){
 if(!SERVICE.test(serviceSid||'')||!APIKEY.test(apiKeySid||'')||
  typeof apiKeySecret!=='string'||Buffer.byteLength(apiKeySecret)<16||
  typeof requisitar!=='function'||!Number.isSafeInteger(timeoutMs)||
  timeoutMs<1000||timeoutMs>30000)
  throw Error('Verificação privada Twilio incompleta.');
 const endpoint='https://verify.twilio.com/v2/Services/'+serviceSid;
 const autorizacao='Basic '+Buffer.from(apiKeySid+':'+apiKeySecret).toString('base64');
 return async function preparacaoPronta(){
  try{
   const resposta=await requisitar(endpoint,{
    method:'GET',
    headers:{Authorization:autorizacao},
    redirect:'error',cache:'no-store',signal:AbortSignal.timeout(timeoutMs)
   });
   if(!resposta?.ok||resposta.status!==200)return false;
   const cfg=await resposta.json();
   return cfg?.sid===serviceSid&&cfg.custom_code_enabled===true&&
    MESSAGING.test(cfg.whatsapp?.msg_service_sid||'')&&
    REMETENTE.test(cfg.whatsapp?.from||'');
  }catch{return false;}
 };
}
