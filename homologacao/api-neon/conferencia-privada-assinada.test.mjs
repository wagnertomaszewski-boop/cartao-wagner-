import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {criarConferenciaPrivadaAssinada} from './conferencia-privada-assinada.mjs';
import {criarVerificadorComprovanteAssinado} from './comprovante-assinado.mjs';
const segredo=randomBytes(32),protocolo='LEGADO-EMISSAO-TESTE-900006';
test('assina somente depois da conferência independente e auditoria',async()=>{
 const eventos=[];
 const assinar=criarConferenciaPrivadaAssinada({
  segredo,conferirIdentidade:async({protocolo:p,referenciaOperador})=>{
   assert.equal(p,protocolo);assert.equal(referenciaOperador,'OP-TESTE-900006');
   eventos.push('conferiu');return true;
  },auditarConferencia:async()=>{eventos.push('auditou');}
 });
 const comprovante=await assinar({protocolo,referenciaOperador:'OP-TESTE-900006',identidadeConferida:true});
 assert.deepEqual(eventos,['conferiu','auditou']);
 assert.equal(await criarVerificadorComprovanteAssinado({segredo})({protocolo,comprovante}),true);
});
test('nega identidade sem conferência, mesmo com campo do chamador',async()=>{
 const assinar=criarConferenciaPrivadaAssinada({
  segredo,conferirIdentidade:async()=>false,auditarConferencia:async()=>{throw Error('não deve auditar');}
 });
 await assert.rejects(()=>assinar({protocolo,referenciaOperador:'OP-TESTE-900006',identidadeConferida:true}),/não confirmada/);
});
test('falha fechada se auditoria falhar',async()=>{
 const assinar=criarConferenciaPrivadaAssinada({
  segredo,conferirIdentidade:async()=>true,auditarConferencia:async()=>{throw Error('auditoria indisponível');}
 });
 await assert.rejects(()=>assinar({protocolo,referenciaOperador:'OP-TESTE-900006'}),/auditoria indisponível/);
});
test('falha fechada se verificação externa falhar',async()=>{
 const assinar=criarConferenciaPrivadaAssinada({
  segredo,conferirIdentidade:async()=>{throw Error('offline');},auditarConferencia:async()=>{}
 });
 await assert.rejects(()=>assinar({protocolo,referenciaOperador:'OP-TESTE-900006'}),/indisponível/);
});
