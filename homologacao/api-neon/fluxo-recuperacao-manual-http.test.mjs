import test from 'node:test';
import assert from 'node:assert/strict';
import {criarServidor} from './server.mjs';
import {criarInicioRecuperacaoManual} from './inicio-recuperacao-manual.mjs';
import {criarOperacoesConfirmacaoCidadao} from './confirmacao-cidadao.mjs';
const TOKEN='admin-token-de-teste-longo-e-unico';
test('HTTP: admin inicia, cidadão confirma; não há liberação sem autorização',async()=>{
 let autorizado=true,consumido=false,confirmacoes=0;
 const codigo='103759',desafioId='a'.repeat(32);
 const iniciarRecuperacao=criarInicioRecuperacaoManual({
  resolverOperador:async t=>t===TOKEN?'admin-1':null,
  autorizarRecuperacao:async()=>autorizado,
  verificacao:{solicitar:async()=>({desafioId,envioManual:{url:'https://wa.me/5551999999999?text=103759'}})}
 });
 const confirmacaoCidadao=criarOperacoesConfirmacaoCidadao({
  verificacao:{confirmar:async d=>{if(consumido||d.codigo!==codigo)return false;consumido=true;confirmacoes++;return true;}}
 });
 const srv=criarServidor({verificarAdmin:async t=>t===TOKEN,verificarMfaOperacao:async()=>true,iniciarRecuperacao,confirmacaoCidadao});
 await new Promise(resolve=>srv.listen(0,'127.0.0.1',resolve));
 const url='http://127.0.0.1:'+srv.address().port;
 const post=(path,body,token)=>fetch(url+path,{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(body)});
 try{
  const pedido={solicitacaoId:'900020',acao:'emitir'};
  assert.equal((await post('/api/admin/chaves/iniciar-confirmacao',pedido)).status,401);
  autorizado=false;
  assert.notEqual((await post('/api/admin/chaves/iniciar-confirmacao',pedido,TOKEN)).status,200);
  autorizado=true;
  const r=await post('/api/admin/chaves/iniciar-confirmacao',pedido,TOKEN);
  assert.equal(r.status,200);assert.equal((await r.json()).desafioId,desafioId);
  const confirmar={...pedido,desafioId,codigo};
  assert.equal((await (await post('/api/cidadao/confirmar-codigo',confirmar)).json()).confirmado,true);
  assert.equal((await (await post('/api/cidadao/confirmar-codigo',confirmar)).json()).confirmado,false);
  assert.equal(confirmacoes,1);
 }finally{await new Promise(resolve=>srv.close(resolve));}
});
