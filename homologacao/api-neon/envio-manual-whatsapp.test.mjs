import test from 'node:test';
import assert from 'node:assert/strict';
import {prepararEnvioManualWhatsapp} from './envio-manual-whatsapp.mjs';
test('gera link WhatsApp manual com texto codificado e telefone mascarado',()=>{
 const r=prepararEnvioManualWhatsapp({telefone:'+5551999999999',codigo:'042731',acao:'emitir'});
 const u=new URL(r.url);
 assert.equal(u.hostname,'wa.me');
 assert.equal(u.pathname,'/5551999999999');
 assert.match(u.searchParams.get('text'),/042731/);
 assert.match(u.searchParams.get('text'),/5 minutos/);
 assert.doesNotMatch(r.telefoneMascarado,/042731/);
});
test('rejeita entradas inválidas e não permite injeção de destino',()=>{
 for(const telefone of ['51999999999','+5511999?text=fraude','+551199999999999999']){
  assert.throws(()=>prepararEnvioManualWhatsapp({telefone,codigo:'123456',acao:'emitir'}));
 }
 assert.throws(()=>prepararEnvioManualWhatsapp({telefone:'+5551999999999',codigo:'12345',acao:'emitir'}));
});
