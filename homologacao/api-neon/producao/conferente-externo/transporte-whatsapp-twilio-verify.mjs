import {criarVerificadorPreparacaoTwilioVerify} from './verificar-preparacao-twilio-verify.mjs';
// Adaptador OPCIONAL de envio real pelo canal WhatsApp do Twilio Verify.
// NÃO é ativado automaticamente, não conecta a serviços durante a importação,
// nem pode acessar o banco Mandato/Supabase ou as chaves Ed25519.
//
// Pré-requisitos operacionais (ainda não configurados):
// - conta Twilio Verify e Service SID com "Custom Verification Code" habilitado;
// - canal WhatsApp liberado e faturamento/limites previamente aprovados;
// - autenticação do serviço independente e segredo fora do repositório;
// - autorização para remeter testes somente a telefones próprios/consentidos.
// Uso: injetar enviarDesafio: criarTransporteWhatsAppTwilioVerify(config)
// no verificador-posse-por-desafio.mjs, sem expor o código ao navegador.
const SERVICE=/^VA[0-9a-fA-F]{32}$/;
const APIKEY=/^SK[0-9a-fA-F]{32}$/;
const CELULAR=/^\+55[1-9]\d{10}$/;
const CODIGO=/^\d{6}$/;

/**
 * @param {{serviceSid:string,apiKeySid:string,apiKeySecret:string,
 * requisitar?:(url:string,options:any)=>Promise<any>,timeoutMs?:number,
 * habilitarEnvioTeste?:boolean,telefonesTestePermitidos?:string[]}} config
 */
export function criarTransporteWhatsAppTwilioVerify({
 serviceSid,apiKeySid,apiKeySecret,requisitar=fetch,timeoutMs=15000,
 habilitarEnvioTeste=false,telefonesTestePermitidos=[]
}={}){
 if(!SERVICE.test(serviceSid||'')||!APIKEY.test(apiKeySid||'')||
  typeof apiKeySecret!=='string'||Buffer.byteLength(apiKeySecret)<16||
  typeof requisitar!=='function'||!Number.isSafeInteger(timeoutMs)||
  timeoutMs<1000||timeoutMs>30000)
  throw Error('Twilio Verify privado não configurado.');
 // Sem habilitação e lista de testes, este adaptador não gera tráfego nem cobranças.
 // Esta candidata NÃO implementa um modo de envio indiscriminado a cidadãos.
 if(typeof habilitarEnvioTeste!=='boolean'||!Array.isArray(telefonesTestePermitidos)||
  telefonesTestePermitidos.length>20||
  !telefonesTestePermitidos.every(n=>typeof n==='string'&&CELULAR.test(n))||
  (habilitarEnvioTeste&&telefonesTestePermitidos.length===0))
  throw Error('Lista restrita de telefones de teste obrigatória.');
 const destinos=new Set(telefonesTestePermitidos);
 const endpoint='https://verify.twilio.com/v2/Services/'+serviceSid+'/Verifications';
 const preparacaoPronta=criarVerificadorPreparacaoTwilioVerify({serviceSid,apiKeySid,apiKeySecret,requisitar,timeoutMs});
 // Basic Auth apenas no servidor. Não registrar config, headers ou resposta bruta.
 const autorizacao='Basic '+Buffer.from(apiKeySid+':'+apiKeySecret).toString('base64');
 return async function enviarDesafio({desafioId,telefoneNovo,codigo,expiraEm}={}){
  if(!habilitarEnvioTeste||!destinos.has(telefoneNovo))return false;
  if(typeof desafioId!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(desafioId)||
   !CELULAR.test(telefoneNovo||'')||!CODIGO.test(codigo||'')||
   typeof expiraEm!=='string'||!Number.isFinite(Date.parse(expiraEm)))
   return false;
  // Revalida a configuração diretamente na Twilio antes de qualquer POST.
  if(!await preparacaoPronta())return false;
  const corpo=new URLSearchParams({To:telefoneNovo,Channel:'whatsapp',CustomCode:codigo});
  try{
   const resposta=await requisitar(endpoint,{
    method:'POST',headers:{
     Authorization:autorizacao,
     'Content-Type':'application/x-www-form-urlencoded'
    },
    body:corpo.toString(),redirect:'error',cache:'no-store',
    signal:AbortSignal.timeout(timeoutMs)
   });
   if(!resposta?.ok||resposta.status!==201)return false;
   const json=await resposta.json();
   // API confirma aceitação da solicitação, NÃO prova entrega do WhatsApp.
   // A posse só será comprovada se a pessoa informar o código correto
   // no verificador privado, antes do vencimento e da quinta tentativa.
   return json?.service_sid===serviceSid&&
    /^VE[0-9a-fA-F]{32}$/.test(json.sid||'')&&
    json.to===telefoneNovo&&
    json.channel==='whatsapp'&&
    json.status==='pending';
  }catch{return false;}
 };
}
