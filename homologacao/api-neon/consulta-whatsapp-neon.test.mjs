import test from 'node:test';
import assert from 'node:assert/strict';
import {criarConsultaWhatsappNeon} from './consulta-whatsapp-neon.mjs';
test('consulta WhatsApp exige vínculo de solicitação e ação na base privada',async()=>{
 let params;
 const consultar=criarConsultaWhatsappNeon({pool:{query:async(sql,args)=>{
  assert.match(sql,/confirmacoes_whatsapp/);assert.match(sql,/desafios_whatsapp/);
  assert.match(sql,/c.acao=\$2::text/);params=args;
  return {rows:[{solicitacao_id:'900020'}]};
 }}});
 assert.deepEqual(await consultar({solicitacaoId:'900020',acao:'emitir'}),{confirmado:true,solicitacaoId:'900020'});
 assert.deepEqual(params,['900020','emitir']);
 assert.equal((await consultar({solicitacaoId:'900020',acao:'recuperar'})).confirmado,false);
});
test('não aceita confirmação de outra solicitação, erro ou dados inválidos',async()=>{
 const consultar=criarConsultaWhatsappNeon({pool:{query:async()=>({rows:[{solicitacao_id:'900021'}]})}});
 assert.equal((await consultar({solicitacaoId:'900020',acao:'emitir'})).confirmado,false);
 const falha=criarConsultaWhatsappNeon({pool:{query:async()=>{throw Error('indisponível')}}});
 assert.equal((await falha({solicitacaoId:'900020',acao:'emitir'})).confirmado,false);
 assert.equal((await falha({solicitacaoId:'-1',acao:'emitir'})).confirmado,false);
});
