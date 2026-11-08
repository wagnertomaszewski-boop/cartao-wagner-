import test from 'node:test';
import assert from 'node:assert/strict';
import {criarConferidorManualAuditado} from './conferidor-manual-auditado.mjs';
const protocolo='LEGADO-EMISSAO-TESTE-900006',operador='OP-TESTE-900006',agora=1794100000000;
const base={protocolo,operador,identidadeVerificada:true,evidenciaConferida:true,status:'aprovado',registroId:'REG-TESTE-900006',decididoEmMs:agora-1000};
function conferir(decisao){return criarConferidorManualAuditado({consultarDecisao:async()=>decisao,relogio:()=>agora});}
test('aceita somente decisão recente e vinculada ao protocolo e operador',async()=>{
 assert.equal(await conferir(base)({protocolo,referenciaOperador:operador}),true);
});
test('nega ausência de evidência e decisão rejeitada',async()=>{
 assert.equal(await conferir({...base,evidenciaConferida:false})({protocolo,referenciaOperador:operador}),false);
 assert.equal(await conferir({...base,status:'rejeitado'})({protocolo,referenciaOperador:operador}),false);
});
test('nega decisão de outro operador, protocolo ou expirada',async()=>{
 assert.equal(await conferir({...base,operador:'OP-OUTRO-1234'})({protocolo,referenciaOperador:operador}),false);
 assert.equal(await conferir({...base,protocolo:'OUTRO'})({protocolo,referenciaOperador:operador}),false);
 assert.equal(await conferir({...base,decididoEmMs:agora-25*60*60*1000})({protocolo,referenciaOperador:operador}),false);
});
test('fonte de decisão indisponível bloqueia',async()=>{
 const verificar=criarConferidorManualAuditado({consultarDecisao:async()=>{throw Error('offline');}});
 assert.equal(await verificar({protocolo,referenciaOperador:operador}),false);
});
