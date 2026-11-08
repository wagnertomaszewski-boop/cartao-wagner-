import test from 'node:test';
import assert from 'node:assert/strict';
import {criarServidor} from './server.mjs';
import {criarConclusaoRecuperacaoPainel} from './conclusao-recuperacao-painel.mjs';
const token='token-admin-teste-123456789012345';
test('HTTP conclusão requer sessão e não aceita operador do navegador',async()=>{
 const chamadas=[];
 const concluirRecuperacao=criarConclusaoRecuperacaoPainel({
  resolverOperador:async t=>t===token?'operador-autenticado':null,
  recuperar:async args=>{chamadas.push(args);return {emitida:true};}
 });
 const srv=criarServidor({verificarAdmin:async t=>t===token,concluirRecuperacao});
 await new Promise(resolve=>srv.listen(0,'127.0.0.1',resolve));
 const url='http://127.0.0.1:'+srv.address().port;
 const dados={solicitacaoId:'900008',desafioId:'a'.repeat(32),atestado:'atestado-assinado-de-teste',operadorId:'operador-falso'};
 const post=t=>fetch(url+'/api/admin/chaves/concluir-recuperacao',{method:'POST',headers:{'Content-Type':'application/json',...(t?{Authorization:'Bearer '+t}:{})},body:JSON.stringify(dados)});
 try{
  assert.equal((await post()).status,401);
  assert.equal((await post('token-invalido-muito-comprido')).status,403);
  assert.equal((await post(token)).status,200);
  assert.equal(chamadas.length,1);
  assert.equal(chamadas[0].operadorId,'operador-autenticado');
 }finally{await new Promise(resolve=>srv.close(resolve));}
});
