import {test} from 'node:test';
import assert from 'node:assert/strict';
import {criarServidor} from './server.mjs';

async function comServidor(opcoes,fn){
 const servidor=criarServidor(opcoes);
 await new Promise(resolve=>servidor.listen(0,'127.0.0.1',resolve));
 try {await fn('http://127.0.0.1:'+servidor.address().port);}
 finally {await new Promise(resolve=>servidor.close(resolve));}
}
test('origem não autorizada não invoca consulta',async()=>{
 let chamadas=0;
 await comServidor({origensPermitidas:['https://app.example.test'],operacoes:{consultar:async()=>{chamadas++;return {};}}},async base=>{
  const r=await fetch(base+'/api/solicitacoes/consultar',{method:'POST',headers:{Origin:'https://malicioso.example.test','Content-Type':'application/json'},body:JSON.stringify({protocolo:'FICTICIO',chave:'a'.repeat(64)})});
  assert.equal(r.status,403);
  assert.equal(r.headers.get('access-control-allow-origin'),null);
  assert.equal(chamadas,0);
 });
});
test('decisão administrativa exige autorização e identidade validadas no servidor',async()=>{
 let chamadas=0;
 await comServidor({verificarAdmin:async()=>true,verificarIdentidade:async()=>false,operacoes:{decidir:async()=>{chamadas++;return {ok:true};}}},async base=>{
  const r=await fetch(base+'/api/admin/recuperacoes/123/decisao',{method:'POST',headers:{Authorization:'Bearer token-ficticio','Content-Type':'application/json'},body:'{}'});
  assert.equal(r.status,403);
  assert.equal(chamadas,0);
 });
});
test('sem handler integrado não ativa consulta',async()=>{
 await comServidor({},async base=>{
  const r=await fetch(base+'/api/solicitacoes/consultar',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
  assert.equal(r.status,503);
 });
});
