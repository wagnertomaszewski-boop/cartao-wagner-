import test from 'node:test';
import assert from 'node:assert/strict';
import {criarServidor} from './server.mjs';
import {criarOperacoesChavesPainel} from './operacoes-chaves-painel.mjs';
import {criarGestorChavesPrivadas} from './gestor-chaves-privadas.mjs';
import {criarAuditorChavesNeon} from './auditoria-chaves-neon.mjs';

const ADMIN='123e4567-e89b-42d3-a456-426614174000';
const TOKEN='token-administrativo-sintetico-123456';
const DADOS={solicitacaoId:'900020',atestado:'comprovante-sintetico-verificado'};
async function comServidor(opcoes,fn){
 const servidor=criarServidor(opcoes);
 await new Promise(resolve=>servidor.listen(0,'127.0.0.1',resolve));
 try{return await fn('http://127.0.0.1:'+servidor.address().port);}
 finally{await new Promise(resolve=>servidor.close(resolve));}
}
test('HTTP -> sessão -> identidade -> transação -> auditoria: emite e revoga',async()=>{
 const eventos=[];
 const gestor=criarGestorChavesPrivadas({
  confirmarIdentidade:async({atestado})=>{eventos.push('identidade');return atestado===DADOS.atestado;},
  autorizarOperador:async({operadorId})=>{eventos.push('autorizacao');return operadorId===ADMIN;},
  transacionar:async fn=>{
   eventos.push('BEGIN');
   const tx={
    revogarAtiva:async()=>{eventos.push('revogar');return 1;},
    inserirHash:async({hash})=>{assert.equal(hash.length,32);eventos.push('hash');},
    queryAuditoria:async()=>{eventos.push('auditoria');return {rowCount:1};}
   };
   await fn(tx);eventos.push('COMMIT');
  },
  auditar:criarAuditorChavesNeon()
 });
 const operacoesChaves=criarOperacoesChavesPainel({resolverOperador:async token=>token===TOKEN?ADMIN:null,gestor});
 await comServidor({verificarAdmin:async token=>token===TOKEN,verificarMfaOperacao:async()=>true,operacoesChaves},async base=>{
  for(const acao of ['emitir','revogar']){
   const r=await fetch(base+'/api/admin/chaves/'+acao,{
    method:'POST',headers:{Authorization:'Bearer '+TOKEN,'Content-Type':'application/json'},
    body:JSON.stringify(DADOS)
   });
   assert.equal(r.status,200);
   const corpo=await r.json();
   if(acao==='emitir')assert.match(corpo.chave,/^[A-Za-z0-9_-]{43}$/);
   else assert.deepEqual(corpo,{revogada:true});
  }
 });
 assert.deepEqual(eventos,[
  'identidade','autorizacao','BEGIN','revogar','hash','auditoria','COMMIT',
  'identidade','autorizacao','BEGIN','revogar','auditoria','COMMIT'
 ]);
});
test('HTTP nega comprovante falso sem abrir transação',async()=>{
 let transacoes=0;
 const gestor=criarGestorChavesPrivadas({
  confirmarIdentidade:async()=>false,
  autorizarOperador:async()=>true,
  transacionar:async()=>{transacoes++;},
  auditar:async()=>{}
 });
 const operacoesChaves=criarOperacoesChavesPainel({resolverOperador:async()=>ADMIN,gestor});
 await comServidor({verificarAdmin:async()=>true,verificarMfaOperacao:async()=>true,operacoesChaves},async base=>{
  const r=await fetch(base+'/api/admin/chaves/emitir',{method:'POST',headers:{Authorization:'Bearer '+TOKEN,'Content-Type':'application/json'},body:JSON.stringify(DADOS)});
  assert.equal(r.status,503);
 });
 assert.equal(transacoes,0);
});
