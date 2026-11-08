import test from 'node:test';
import assert from 'node:assert/strict';
import {criarRegistradorDecisaoPrivada} from './registrar-decisao-privada.mjs';
const protocolo='LEGADO-EMISSAO-TESTE-900006',referenciaOperador='OP-TESTE-900006',registroId='REG-TESTE-900006';
const args={protocolo,referenciaOperador,registroId,tokenOperador:'token-ficticio'};
const agora=1794100000000;
function montar(){
 const registrados=new Set();
 const chamadas=[];
 const registrar=criarRegistradorDecisaoPrivada({
  autorizarOperador:async()=>true,
  verificarEvidencia:async()=>({protocolo,operador:referenciaOperador,registroId,verificada:true,identidadeConfirmada:true,verificadaEmMs:agora-1000}),
  auditar:async()=>{chamadas.push('auditoria');},
  // Simula índice UNIQUE do Neon com reserva atômica antes de qualquer await.
  registrarRpc:async({registroId})=>{
   chamadas.push('rpc');
   if(registrados.has(registroId))throw Error('registro_id duplicado');
   registrados.add(registroId);
   await Promise.resolve();
   return {id:registrados.size};
  },relogio:()=>agora
 });
 return {registrar,chamadas,registrados};
}
test('reutilização sequencial do mesmo atestado não cria segunda decisão',async()=>{
 const {registrar,registrados}=montar();
 await registrar(args);
 await assert.rejects(()=>registrar(args),/duplicado/);
 assert.equal(registrados.size,1);
});
test('tentativas concorrentes com mesmo registroId só gravam uma decisão',async()=>{
 const {registrar,registrados}=montar();
 const resultados=await Promise.allSettled([registrar(args),registrar(args)]);
 assert.equal(resultados.filter(x=>x.status==='fulfilled').length,1);
 assert.equal(resultados.filter(x=>x.status==='rejected').length,1);
 assert.equal(registrados.size,1);
});
