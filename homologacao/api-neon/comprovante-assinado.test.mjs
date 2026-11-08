import test from 'node:test';
import assert from 'node:assert/strict';
import {criarEmissorComprovanteAssinado,criarVerificadorComprovanteAssinado} from './comprovante-assinado.mjs';
const segredo=Buffer.alloc(32,7),inicio=1794000000000;
const emitir=criarEmissorComprovanteAssinado({segredo,relogio:()=>inicio,gerarNonce:()=> 'a'.repeat(32)});
test('comprovante assinado aceita somente protocolo correto dentro do prazo',async()=>{
 const comprovante=emitir({protocolo:'LEGADO-TESTE',identidadeConferida:true});
 const validar=criarVerificadorComprovanteAssinado({segredo,relogio:()=>inicio+60000});
 assert.equal(await validar({protocolo:'LEGADO-TESTE',comprovante}),true);
 assert.equal(await validar({protocolo:'OUTRO',comprovante}),false);
 assert.equal(await validar({protocolo:'LEGADO-TESTE',comprovante:comprovante.slice(0,-1)+(comprovante.endsWith('0')?'1':'0')}),false);
 assert.equal(await criarVerificadorComprovanteAssinado({segredo,relogio:()=>inicio+900001})({protocolo:'LEGADO-TESTE',comprovante}),false);
 assert.equal(await criarVerificadorComprovanteAssinado({segredo,relogio:()=>inicio-1})({protocolo:'LEGADO-TESTE',comprovante}),false);
});
test('sem conferência independente não emite',()=>{
 assert.throws(()=>emitir({protocolo:'LEGADO-TESTE',identidadeConferida:false}),/Conferência independente/);
 assert.throws(()=>criarEmissorComprovanteAssinado({segredo:Buffer.alloc(4),gerarNonce:()=>''}),/Emissor privado/);
});
