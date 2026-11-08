import test from 'node:test';
import assert from 'node:assert/strict';
import {criarGestorChavesPrivadas} from './gestor-chaves-privadas.mjs';
import {hashChavePrivada} from './chaves-privadas.mjs';

const base={solicitacaoId:'900010',operadorId:'123e4567-e89b-42d3-a456-426614174000',atestado:'atestado-sintetico-valido'};
function fixture({identidade=true,autorizado=true,falharAuditoria=false}={}) {
 const eventos=[];
 const gestor=criarGestorChavesPrivadas({
  confirmarIdentidade:async()=>{eventos.push('identidade');return identidade;},
  autorizarOperador:async()=>{eventos.push('autorizacao');return autorizado;},
  transacionar:async fn=>{eventos.push('begin');await fn({
   revogarAtiva:async()=>{eventos.push('revogar');return 1;},
   inserirHash:async ({hash})=>{assert.equal(hash.length,32);eventos.push('inserir');}
  });eventos.push('commit');},
  auditar:async()=>{eventos.push('auditar');if(falharAuditoria)throw Error('auditoria falhou');}
 });
 return {gestor,eventos};
}
test('emite chave forte somente após autorização, auditoria e commit',async()=>{
 const {gestor,eventos}=fixture();
 const r=await gestor.emitir(base);
 assert.equal(r.chave.length,43);
 assert.equal(hashChavePrivada(r.chave).length,32);
 assert.deepEqual(eventos,['identidade','autorizacao','begin','revogar','inserir','auditar','commit']);
});
test('revoga sem emitir outra chave',async()=>{
 const {gestor,eventos}=fixture();
 assert.deepEqual(await gestor.revogar(base),{revogada:true});
 assert.deepEqual(eventos,['identidade','autorizacao','begin','revogar','auditar','commit']);
});
test('nega identidade sem mutação',async()=>{
 const {gestor,eventos}=fixture({identidade:false});
 await assert.rejects(gestor.emitir(base),/Identidade/);
 assert.deepEqual(eventos,['identidade']);
});
test('nega operador sem mutação',async()=>{
 const {gestor,eventos}=fixture({autorizado:false});
 await assert.rejects(gestor.revogar(base),/Operador/);
 assert.deepEqual(eventos,['identidade','autorizacao']);
});
test('falha de auditoria impede confirmação e entrega da chave',async()=>{
 const {gestor,eventos}=fixture({falharAuditoria:true});
 await assert.rejects(gestor.emitir(base),/auditoria falhou/);
 assert.ok(!eventos.includes('commit'));
});
test('sem dependências seguras não inicia',()=>{
 assert.throws(()=>criarGestorChavesPrivadas(),/Dependência obrigatória/);
});
