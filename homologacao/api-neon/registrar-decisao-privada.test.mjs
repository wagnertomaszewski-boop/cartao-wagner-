import test from 'node:test';
import assert from 'node:assert/strict';
import {criarRegistradorDecisaoPrivada} from './registrar-decisao-privada.mjs';
const protocolo='LEGADO-EMISSAO-TESTE-900006',referenciaOperador='OP-TESTE-900006',registroId='REG-TESTE-900006',agora=1794100000000;
function montar({autorizado=true,evidenciaValida=true,idade=1000}={}){
 const eventos=[];
 const registrar=criarRegistradorDecisaoPrivada({
  autorizarOperador:async()=>{eventos.push('auth');return autorizado;},
  verificarEvidencia:async()=>{eventos.push('evidencia');return {
   protocolo,operador:referenciaOperador,registroId,
   verificada:evidenciaValida,identidadeConfirmada:true,verificadaEmMs:agora-idade
  };},
  auditar:async()=>{eventos.push('auditoria');},
  registrarRpc:async(d)=>{eventos.push('rpc');return d;},
  relogio:()=>agora
 });
 return {registrar,eventos};
}
const args={protocolo,referenciaOperador,registroId,tokenOperador:'t'.repeat(30)};
test('registra somente após autorização, evidência e auditoria',async()=>{
 const {registrar,eventos}=montar();
 const resultado=await registrar({...args,identidadeVerificada:true});
 assert.equal(resultado.status,'aprovado');
 assert.deepEqual(eventos,['auth','evidencia','auditoria','rpc']);
});
test('operador não autorizado não consulta evidência',async()=>{
 const {registrar,eventos}=montar({autorizado:false});
 await assert.rejects(()=>registrar(args),/não autorizado/);
 assert.deepEqual(eventos,['auth']);
});
test('evidência não confirmada ou expirada não grava',async()=>{
 for(const opcoes of [{evidenciaValida:false},{idade:16*60*1000}]){
  const {registrar,eventos}=montar(opcoes);
  await assert.rejects(()=>registrar(args),/Evidência/);
  assert.deepEqual(eventos,['auth','evidencia']);
 }
});
test('auditoria indisponível bloqueia RPC',async()=>{
 const eventos=[];
 const registrar=criarRegistradorDecisaoPrivada({
  autorizarOperador:async()=>true,
  verificarEvidencia:async()=>({...args,operador:referenciaOperador,verificada:true,identidadeConfirmada:true,verificadaEmMs:agora}),
  auditar:async()=>{throw Error('auditoria offline');},
  registrarRpc:async()=>{eventos.push('rpc');},
  relogio:()=>agora
 });
 await assert.rejects(()=>registrar(args),/auditoria offline/);
 assert.deepEqual(eventos,[]);
});
