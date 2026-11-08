import test from 'node:test';
import assert from 'node:assert/strict';
import {criarVerificacaoWhatsapp} from './verificacao-whatsapp.mjs';
import {prepararEnvioManualWhatsapp} from './envio-manual-whatsapp.mjs';
test('modo manual prepara link mas não afirma entrega; código só valida uma vez',async()=>{
 let d,consumido=false,tentativas=0;
 const otp=criarVerificacaoWhatsapp({
  segredo:'segredo-local-teste-com-mais-de-32-bytes',
  buscarContatoConfirmado:async()=>({telefone:'+5551999999999'}),
  armazenarDesafio:async x=>{d=x;},
  obterDesafio:async()=>!consumido&&++tentativas<=5?d:null,
  consumirDesafio:async()=>{consumido=true;return true;},
  enviarCodigo:async args=>({manual:true,...prepararEnvioManualWhatsapp(args)})
 });
 const r=await otp.solicitar({solicitacaoId:'900020',acao:'emitir'});
 assert.ok(r.envioManual?.url.startsWith('https://wa.me/'));
 const codigo=new URL(r.envioManual.url).searchParams.get('text').match(/\b[0-9]{6}\b/)[0];
 const entrada={desafioId:r.desafioId,codigo,solicitacaoId:'900020',acao:'emitir'};
 assert.equal(await otp.confirmar(entrada),true);
 assert.equal(await otp.confirmar(entrada),false);
});
