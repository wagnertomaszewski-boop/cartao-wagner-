import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {generateKeyPairSync} from 'node:crypto';
import {PGlite} from '@electric-sql/pglite';
import {criarTransporteWhatsAppTwilioVerify} from '../conferente-externo/transporte-whatsapp-twilio-verify.mjs';
import {criarPersistenciaPossePostgres} from '../conferente-externo/persistencia-posse-postgres.mjs';
import {criarVerificadorPossePorDesafio} from '../conferente-externo/verificador-posse-por-desafio.mjs';
import {criarEmissorExternoPorRecibo} from '../conferente-externo/emitir-atestado-por-recibo.mjs';
import {criarVerificadorContatoIndependente} from '../verificador-contato-independente.mjs';

test('simula ponta a ponta com envio WhatsApp aceito, prova única no PostgreSQL isolado e duas assinaturas',async()=>{
 const db=new PGlite();
 try{
  const schema=await readFile(new URL('../conferente-externo/sql/laboratorio-desafios-posse-NAO-EXECUTAR.sql',import.meta.url),'utf8');
  await db.exec(schema);
  const query=(sql,args)=>sql.includes('pg_advisory_xact_lock')
   ?Promise.resolve({rows:[]}):db.query(sql,args);
  const persistencia=criarPersistenciaPossePostgres({pool:{
   connect:async()=>({query,release(){}}),query
  }});
  const duasChaves={posse:generateKeyPairSync('ed25519'),conferencia:generateKeyPairSync('ed25519')};
  const ctx={pedidoId:'00000000-0000-4000-8000-000000000011',
   solicitacaoId:'123',operadorId:'00000000-0000-4000-8000-000000000012',
   telefoneOriginal:'+555188887777',telefoneNovo:'+5551999988888'};
  const verificadorId='00000000-0000-4000-8000-000000000015';
  const conferenteId='00000000-0000-4000-8000-000000000013';
  const agora=Date.parse('2026-11-23T23:40:00.000Z');
  const serviceSid='VA'+'a'.repeat(32);
  const envios=[],recibos=[];
  const enviar=criarTransporteWhatsAppTwilioVerify({
   serviceSid,apiKeySid:'SK'+'b'.repeat(32),apiKeySecret:'SEGREDO-FICTICIO-SEM-CREDENCIAL-REAL',
   requisitar:async(url,op)=>{
    if(op.method==='GET'){
     assert.equal(url,'https://verify.twilio.com/v2/Services/'+serviceSid);
     return {ok:true,status:200,json:async()=>({sid:serviceSid,custom_code_enabled:true,
      whatsapp:{msg_service_sid:'MG'+'d'.repeat(32),from:'whatsapp:+5551999997777'}})};
    }
    assert.equal(url,'https://verify.twilio.com/v2/Services/'+serviceSid+'/Verifications');
    envios.push(Object.fromEntries(new URLSearchParams(op.body)));
    return {ok:true,status:201,json:async()=>({
     sid:'VE'+'c'.repeat(32),service_sid:serviceSid,to:ctx.telefoneNovo,
     channel:'whatsapp',status:'pending'
    })};
   }
  });
  const verificador=criarVerificadorPossePorDesafio({
   chavePrivadaVerificador:duasChaves.posse.privateKey,verificadorId,
   segredoDesafios:'segredo-sintetico-exclusivo-ao-verificador-mais-de-32',
   persistencia,relogio:()=>agora,envioReal:false,
   buscarContextoAutorizado:async({pedidoId,operadorId})=>{
    assert.equal(pedidoId,ctx.pedidoId);assert.equal(operadorId,ctx.operadorId);
    return ctx;
   },
   enviarDesafio:enviar,registrarReciboPrivado:async x=>{recibos.push(x);return true;}
  });
  const result=await verificador.iniciar({pedidoId:ctx.pedidoId,operadorId:ctx.operadorId});
  assert.equal('codigo' in result,false);
  assert.equal(envios.length,1);
  assert.equal(envios[0].Channel,'whatsapp');
  assert.equal(envios[0].To,ctx.telefoneNovo);
  assert.match(envios[0].CustomCode,/^\d{6}$/);
  const errado=envios[0].CustomCode==='000000'?'111111':'000000';
  assert.equal((await verificador.confirmar({desafioId:result.desafioId,codigo:errado})).confirmado,false);
  assert.equal(recibos.length,0);
  assert.equal((await verificador.confirmar({desafioId:result.desafioId,codigo:envios[0].CustomCode})).confirmado,true);
  assert.equal((await verificador.confirmar({desafioId:result.desafioId,codigo:envios[0].CustomCode})).confirmado,false);
  assert.equal(recibos.length,1);
  const emitir=criarEmissorExternoPorRecibo({
   chavePrivadaConferente:duasChaves.conferencia.privateKey,
   chavePublicaVerificador:duasChaves.posse.publicKey,
   conferenteId,verificadoresPermitidos:[verificadorId],relogio:()=>agora
  });
  const atestado=emitir(recibos[0]);
  assert.equal(typeof atestado?.assinatura,'string');
  const validar=criarVerificadorContatoIndependente({
   chavePublicaConferente:duasChaves.conferencia.publicKey,
   conferentesPermitidos:[conferenteId],buscarAtestado:async()=>atestado,
   relogio:()=>agora
  });
  assert.equal((await validar(ctx))?.validado,true);
  const contagem=(await db.query('SELECT count(*)::int AS total FROM verificador_posse_hml.desafios')).rows[0];
  assert.equal(contagem.total,1);
 }finally{await db.close();}
});
