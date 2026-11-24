import test from 'node:test';
import assert from 'node:assert/strict';
import {criarVerificadorPreparacaoTwilioVerify} from '../conferente-externo/verificar-preparacao-twilio-verify.mjs';
import {criarTransporteWhatsAppTwilioVerify} from '../conferente-externo/transporte-whatsapp-twilio-verify.mjs';

const serviceSid='VA'+'a'.repeat(32);
const config={serviceSid,apiKeySid:'SK'+'b'.repeat(32),apiKeySecret:'SEGREDO-SINTETICO-ISOLADO-DE-TESTE',habilitarEnvioTeste:true,telefonesTestePermitidos:['+5551999988888']};
const envio={desafioId:'00000000-0000-4000-8000-000000000011',telefoneNovo:'+5551999988888',
 codigo:'123456',expiraEm:'2026-11-23T23:50:00.000Z'};
const pronto={sid:serviceSid,custom_code_enabled:true,
 whatsapp:{msg_service_sid:'MG'+'c'.repeat(32),from:'whatsapp:+5551999997777'}};

test('preflight usa somente GET oficial e libera somente serviço com CustomCode e remetente WhatsApp',async()=>{
 const chamadas=[];
 const verificar=criarVerificadorPreparacaoTwilioVerify({...config,requisitar:async(url,opts)=>{
  chamadas.push({url,opts});
  return {ok:true,status:200,json:async()=>pronto};
 }});
 assert.equal(await verificar(),true);
 assert.equal(chamadas.length,1);
 assert.equal(chamadas[0].url,'https://verify.twilio.com/v2/Services/'+serviceSid);
 assert.equal(chamadas[0].opts.method,'GET');
 assert.equal(new URL(chamadas[0].url).search,'');
 assert.equal(chamadas[0].opts.redirect,'error');
 assert.equal(chamadas[0].opts.cache,'no-store');
 assert.equal(JSON.stringify(chamadas[0].opts).includes(config.apiKeySecret),false);
});

test('preflight falha fechado sem remetente, custom code, resposta válida ou rede',async()=>{
 const casos=[
  {...pronto,custom_code_enabled:false},
  {...pronto,custom_code_enabled:undefined},
  {...pronto,sid:'VA'+'d'.repeat(32)},
  {...pronto,whatsapp:null},
  {...pronto,whatsapp:{...pronto.whatsapp,msg_service_sid:null}},
  {...pronto,whatsapp:{...pronto.whatsapp,from:'whatsapp:invalido'}},
  {...pronto,whatsapp:{...pronto.whatsapp,from:null}},
 ];
 for(const cfg of casos){
  const verificar=criarVerificadorPreparacaoTwilioVerify({...config,
   requisitar:async()=>({ok:true,status:200,json:async()=>cfg})
  });
  assert.equal(await verificar(),false,JSON.stringify(cfg));
 }
 for(const resposta of [
  {ok:false,status:401},{ok:false,status:429},{ok:true,status:201}
 ]){
  const v=criarVerificadorPreparacaoTwilioVerify({...config,requisitar:async()=>resposta});
  assert.equal(await v(),false);
 }
 const erro=criarVerificadorPreparacaoTwilioVerify({...config,requisitar:async()=>{throw Error('OFFLINE');}});
 assert.equal(await erro(),false);
});

test('transporte NÃO tenta POST quando configuração do serviço está incompleta',async()=>{
 for(const incompleto of [{...pronto,custom_code_enabled:false},{...pronto,whatsapp:null}]){
  const chamadas=[];
  const enviar=criarTransporteWhatsAppTwilioVerify({...config,requisitar:async(url,opts)=>{
   chamadas.push({url,method:opts.method});
   return {ok:true,status:200,json:async()=>incompleto};
  }});
  assert.equal(await enviar(envio),false);
  assert.deepEqual(chamadas.map(x=>x.method),['GET']);
 }
});

test('preflight exige credenciais válidas, sem recorrer à produção ou a configuração padrão',()=>{
 assert.throws(()=>criarVerificadorPreparacaoTwilioVerify({...config,serviceSid:'invalido'}),/incompleta/);
 assert.throws(()=>criarVerificadorPreparacaoTwilioVerify({...config,apiKeySid:'invalido'}),/incompleta/);
 assert.throws(()=>criarVerificadorPreparacaoTwilioVerify({...config,apiKeySecret:'curto'}),/incompleta/);
});
