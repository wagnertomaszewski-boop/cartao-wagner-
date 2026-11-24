import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync} from 'node:crypto';
import {criarTransporteWhatsAppTwilioVerify} from '../conferente-externo/transporte-whatsapp-twilio-verify.mjs';
import {criarVerificadorPossePorDesafio} from '../conferente-externo/verificador-posse-por-desafio.mjs';

const serviceSid='VA'+'a'.repeat(32),apiKeySid='SK'+'b'.repeat(32);
const apiKeySecret='CHAVE-FICTICIA-SEM-ACESSO-A-QUALQUER-CONTA';
const desafioId='00000000-0000-4000-8000-000000000011';
const operadorId='00000000-0000-4000-8000-000000000012';
const verificadorId='00000000-0000-4000-8000-000000000015';
const novo='+5551999988888';
const ctx={pedidoId:desafioId,operadorId,solicitacaoId:'123',
 telefoneOriginal:'+555188887777',telefoneNovo:novo};
const sucesso={ok:true,status:201,json:async()=>({
 sid:'VE'+'e'.repeat(32),service_sid:serviceSid,
 to:novo,channel:'whatsapp',status:'pending'
})};
const preparacao={ok:true,status:200,json:async()=>({sid:serviceSid,custom_code_enabled:true,whatsapp:{msg_service_sid:'MG'+'d'.repeat(32),from:'whatsapp:+5551999997777'}})};
const entrada={desafioId,telefoneNovo:novo,codigo:'123456',expiraEm:'2026-11-24T20:00:00.000Z'};
const config={serviceSid,apiKeySid,apiKeySecret,habilitarEnvioTeste:true,telefonesTestePermitidos:[novo]};

test('envio via WhatsApp Verify usa código customizado e URL HTTPS fixa, sem retornar dados sensíveis',async()=>{
 const chamadas=[];
 const enviar=criarTransporteWhatsAppTwilioVerify({...config,
  requisitar:async(url,options)=>{chamadas.push({url,options});return options.method==='GET'?preparacao:sucesso;}
 });
 assert.equal(await enviar(entrada),true);
 assert.equal(chamadas.length,2);
 assert.equal(chamadas[0].url,'https://verify.twilio.com/v2/Services/'+serviceSid);
 assert.equal(chamadas[0].options.method,'GET');
 assert.equal(chamadas[1].url,'https://verify.twilio.com/v2/Services/'+serviceSid+'/Verifications');
 assert.equal(new URL(chamadas[1].url).search,'');
 const op=chamadas[1].options;
 assert.equal(op.method,'POST');
 assert.equal(op.redirect,'error');
 assert.equal(op.headers['Content-Type'],'application/x-www-form-urlencoded');
 assert.match(op.headers.Authorization,/^Basic /);
 assert.equal(JSON.stringify(op).includes(apiKeySecret),false);
 assert.deepEqual(Object.fromEntries(new URLSearchParams(op.body)),{
  To:novo,Channel:'whatsapp',CustomCode:'123456'
 });
 assert.equal('response' in sucesso,false);
});

test('nunca trata uma rejeição, erro do provedor ou resposta inconsistente como entrega aceita',async()=>{
 const casos=[
  {ok:false,status:401,json:async()=>({})},
  {ok:false,status:429,json:async()=>({})},
  {ok:true,status:202,json:async()=>({...await sucesso.json()})},
  {ok:true,status:201,json:async()=>({...await sucesso.json(),to:'+5551999980000'})},
  {ok:true,status:201,json:async()=>({...await sucesso.json(),status:'approved'})},
  {ok:true,status:201,json:async()=>({...await sucesso.json(),channel:'sms'})},
  {ok:true,status:201,json:async()=>({...await sucesso.json(),sid:'invalido'})},
  {ok:true,status:201,json:async()=>({...await sucesso.json(),service_sid:'VA'+'f'.repeat(32)})}
 ];
 for(const resposta of casos){
  const enviar=criarTransporteWhatsAppTwilioVerify({...config,requisitar:async(_url,opts)=>opts.method==='GET'?preparacao:resposta});
  assert.equal(await enviar(entrada),false);
 }
 const enviarErro=criarTransporteWhatsAppTwilioVerify({...config,requisitar:async()=>{throw Error('rede indisponivel');}});
 assert.equal(await enviarErro(entrada),false);
});

test('configuração inválida ou telefone incompleto não gera qualquer requisição',async()=>{
 assert.throws(()=>criarTransporteWhatsAppTwilioVerify({...config,serviceSid:'invalido'}),/não configurado/);
 assert.throws(()=>criarTransporteWhatsAppTwilioVerify({...config,apiKeySid:'invalida'}),/não configurado/);
 assert.throws(()=>criarTransporteWhatsAppTwilioVerify({...config,apiKeySecret:'curto'}),/não configurado/);
 let chamadas=0;
 const enviar=criarTransporteWhatsAppTwilioVerify({...config,requisitar:async()=>{chamadas++;return sucesso;}});
 for(const d of [
  {...entrada,codigo:'123'}, {...entrada,telefoneNovo:'+555188887777'},
  {...entrada,telefoneNovo:'+55119999999999'}, {...entrada,desafioId:'inválido'},
  {...entrada,expiraEm:'ontem'}
 ])assert.equal(await enviar(d),false);
 assert.equal(chamadas,0);
});

test('envio real fica desligado por padrão, inclusive com credenciais válidas',async()=>{
 let consultas=0;
 const enviar=criarTransporteWhatsAppTwilioVerify({
  serviceSid,apiKeySid,apiKeySecret,
  requisitar:async()=>{consultas++;throw Error('Não deveria haver rede');}
 });
 assert.equal(await enviar(entrada),false);
 assert.equal(consultas,0);
});

test('habilitação só permite destinatário explicitamente autorizado para teste',async()=>{
 let consultas=0;
 const enviar=criarTransporteWhatsAppTwilioVerify({
  ...config,requisitar:async()=>{consultas++;throw Error('Não deveria enviar');}
 });
 const outroNumero={...entrada,telefoneNovo:'+5551999988887'};
 assert.equal(await enviar(outroNumero),false);
 assert.equal(consultas,0);
 assert.throws(()=>criarTransporteWhatsAppTwilioVerify({
  ...config,telefonesTestePermitidos:[]
 }),/Lista restrita/);
 assert.throws(()=>criarTransporteWhatsAppTwilioVerify({
  ...config,telefonesTestePermitidos:['+555188887777']
 }),/Lista restrita/);
 assert.throws(()=>criarTransporteWhatsAppTwilioVerify({
  ...config,habilitarEnvioTeste:'true'
 }),/Lista restrita/);
});

test('inicia desafio com provedor, mas não confirma posse sem receber código correto no servidor',async()=>{
 let agora=Date.parse('2026-11-23T21:00:00.000Z');
 const chave=generateKeyPairSync('ed25519');
 const registros=new Map(),envios=[],recibos=[];
 const persistencia={
  async criar(d){registros.set(d.desafioId,d);return true;},
  async verificar(){return null;},
  async revogar({desafioId}){registros.delete(desafioId);}
 };
 const transporte=criarTransporteWhatsAppTwilioVerify({...config,
  requisitar:async(url,opt)=>{
   if(opt.method==='GET')return preparacao;
   envios.push(Object.fromEntries(new URLSearchParams(opt.body)));
   return sucesso;
  }
 });
 const app=criarVerificadorPossePorDesafio({
  chavePrivadaVerificador:chave.privateKey,verificadorId,
  segredoDesafios:'segredo-teste-com-no-minimo-trinta-e-dois-caracteres',
  buscarContextoAutorizado:async()=>({...ctx}),
  enviarDesafio:transporte,persistencia,
  registrarReciboPrivado:async a=>{recibos.push(a);return true;},
  relogio:()=>agora
 });
 const started=await app.iniciar({pedidoId:ctx.pedidoId,operadorId});
 assert.equal('codigo' in started,false);
 assert.equal(envios.length,1);
 assert.equal(envios[0].To,novo);
 assert.match(envios[0].CustomCode,/^\d{6}$/);
 assert.equal((await app.confirmar({desafioId:started.desafioId,codigo:'000000'})).confirmado,false);
 assert.equal(recibos.length,0);
 assert.equal(registros.size,1);
});
