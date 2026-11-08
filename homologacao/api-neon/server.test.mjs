import {test} from 'node:test';
import assert from 'node:assert/strict';
import {criarServidor} from './server.mjs';

async function comServidor(opcoes, executar) {
  const server = criarServidor(opcoes);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try { await executar('http://127.0.0.1:' + server.address().port); }
  finally { await new Promise(resolve => server.close(resolve)); }
}
test('rotas administrativas exigem autenticação e autorização', async () => {
  const tokens = [];
  await comServidor({verificarAdmin: async token => {tokens.push(token); return token === 'admin-valido';}}, async base => {
    for (const [path,method] of [['/api/admin/recuperacoes','GET'], ['/api/admin/recuperacoes/123/decisao','POST']]) {
      assert.equal((await fetch(base+path,{method})).status,401);
      assert.equal((await fetch(base+path,{method,headers:{Authorization:'Bearer invalido'}})).status,403);
      assert.equal((await fetch(base+path,{method,headers:{Authorization:'Bearer admin-valido'}})).status,503);
    }
    assert.deepEqual(tokens,['invalido','admin-valido','invalido','admin-valido']);
  });
});
test('sem verificador configurado, nenhum token autoriza administrador',async()=>{
  await comServidor({},async base=>{
    assert.equal((await fetch(base+'/api/admin/recuperacoes',{headers:{Authorization:'Bearer qualquer'}})).status,403);
    assert.equal((await fetch(base+'/api/recuperacao/solicitar',{method:'POST'})).status,503);
    assert.equal((await fetch(base+'/api/solicitacoes/consultar',{method:'POST'})).status,503);
    assert.equal((await fetch(base+'/health')).status,200);
    assert.equal((await fetch(base+'/health',{headers:{Origin:'https://site-externo.com'}})).status,403);
  });
});

test('handler de homologação recebe JSON somente após validação e autenticação', async () => {
  let chamadas = 0;
  await comServidor({
    verificarAdmin: async token => token === 'autorizado',
    verificarIdentidade: async () => true,
    operacoes: { decidir: async ({dados,pedidoId}) => {chamadas++; return {pedidoId, aprovado: dados.aprovar};} }
  }, async base => {
    const url=base+'/api/admin/recuperacoes/15/decisao';
    const json={method:'POST',headers:{Authorization:'Bearer autorizado','Content-Type':'application/json'},body:JSON.stringify({aprovar:false})};
    assert.equal((await fetch(url,{...json,headers:{...json.headers,Authorization:'Bearer errado'}})).status,403);
    assert.equal((await fetch(url,{...json,body:'{'})).status,400);
    assert.equal((await fetch(url,{...json,body:JSON.stringify({texto:'x'.repeat(5000)})})).status,413);
    const ok=await fetch(url,json);
    assert.equal(ok.status,200);
    assert.deepEqual(await ok.json(),{pedidoId:'15',aprovado:false});
    assert.equal(chamadas,1);
  });
});

test('health indica apenas habilitação das rotas, sem alegar conexão com banco',async()=>{
 await comServidor({},async base=>{
  const resposta=await (await fetch(base+'/health')).json();
  assert.deepEqual(resposta,{status:'ok',modo:'homologacao',rotasCidadaoHabilitadas:false,consultaPrivadaHabilitada:false});
 });
 await comServidor({operacoes:{solicitar:async()=>({}),consultar:async()=>({})}},async base=>{
  const resposta=await (await fetch(base+'/health')).json();
  assert.equal(resposta.rotasCidadaoHabilitadas,true);
  assert.equal(resposta.modo,'homologacao');
 });
});

test('aprovação administrativa falha fechada sem verificação de identidade no servidor',async()=>{
 let decisoes=0;
 await comServidor({
  verificarAdmin:async token=>token==='admin-ficticio',
  operacoes:{decidir:async()=>{decisoes++;return {aprovado:true};}}
 },async base=>{
  const url=base+'/api/admin/recuperacoes/42/decisao';
  const enviar=body=>fetch(url,{method:'POST',headers:{Authorization:'Bearer admin-ficticio','Content-Type':'application/json'},body:JSON.stringify(body)});
  assert.equal((await enviar({aprovar:true,identidadeConfirmada:true})).status,403);
  assert.equal((await enviar({aprovar:false,identidadeConfirmada:true})).status,403);
  assert.equal(decisoes,0);
 });
});

test('verificador de identidade falso ou com erro impede decisão',async()=>{
 for(const verificarIdentidade of [async()=>false,async()=>{throw Error('Falha fictícia');}]){
  let decisoes=0;
  await comServidor({verificarAdmin:async()=>true,verificarIdentidade,operacoes:{decidir:async()=>{decisoes++;return {};}}},async base=>{
   const resposta=await fetch(base+'/api/admin/recuperacoes/42/decisao',{method:'POST',headers:{Authorization:'Bearer teste','Content-Type':'application/json'},body:JSON.stringify({aprovar:true})});
   assert.equal(resposta.status,403);
   assert.equal(decisoes,0);
  });
 }
});

test('verificação de identidade recebe token do administrador autenticado, não campo enviado pelo navegador',async()=>{
 let identidadeRecebida, decisoes=0;
 await comServidor({
  verificarAdmin:async token=>token==='token-ficticio-autorizado',
  verificarIdentidade:async contexto=>{identidadeRecebida=contexto;return false;},
  operacoes:{decidir:async()=>{decisoes++;return {};}}
 },async base=>{
  const resposta=await fetch(base+'/api/admin/recuperacoes/12/decisao',{method:'POST',headers:{Authorization:'Bearer token-ficticio-autorizado','Content-Type':'application/json'},body:JSON.stringify({aprovar:true,token:'token-falso',identidadeConfirmada:true})});
  assert.equal(resposta.status,403);
  assert.deepEqual(identidadeRecebida,{pedidoId:'12',token:'token-ficticio-autorizado'});
  assert.equal(decisoes,0);
 });
});


test('rotas inexistentes e métodos incorretos não executam operações',async()=>{
 let chamadas=0;
 await comServidor({operacoes:{consultar:async()=>{chamadas++;return {};},solicitar:async()=>{chamadas++;return {};}}},async base=>{
  for(const [rota,metodo] of [['/health','POST'],['/api/solicitacoes/consultar','GET'],['/api/recuperacao/solicitar','GET'],['/api/admin/recuperacoes/1/decisao','GET'],['/api/desconhecida','POST']]){
   const resposta=await fetch(base+rota,{method:metodo});
   assert.equal(resposta.status,404,metodo+' '+rota);
   assert.deepEqual(await resposta.json(),{erro:'Rota não encontrada'});
  }
  assert.equal(chamadas,0);
 });
});

test('origem externa não pode invocar handler mesmo com corpo válido',async()=>{
 let chamadas=0;
 await comServidor({operacoes:{consultar:async()=>{chamadas++;return {ok:true};}}},async base=>{
  const resposta=await fetch(base+'/api/solicitacoes/consultar',{method:'POST',headers:{Origin:'https://origem-nao-autorizada.example','Content-Type':'application/json'},body:'{}'});
  assert.equal(resposta.status,403);
  assert.equal(chamadas,0);
 });
});

test('CORS autorizado não dispensa autenticação administrativa',async()=>{
 await comServidor({origensPermitidas:['https://painel-teste.example']},async base=>{
  const origem='https://painel-teste.example';
  const preflight=await fetch(base+'/api/admin/recuperacoes',{method:'OPTIONS',headers:{Origin:origem,'Access-Control-Request-Method':'GET'}});
  assert.equal(preflight.status,204);
  assert.equal(preflight.headers.get('access-control-allow-origin'),origem);
  const resposta=await fetch(base+'/api/admin/recuperacoes',{headers:{Origin:origem}});
  assert.equal(resposta.status,401);
 });
});

test('rotas de chaves negam sem sessão e sem handler habilitado',async()=>{
 await comServidor({verificarAdmin:async token=>token==='admin-valido',verificarMfaOperacao:async()=>true,limitador:{verificar:()=>true}},async base=>{
  for(const acao of ['emitir','revogar']){
   const url=base+'/api/admin/chaves/'+acao;
   assert.equal((await fetch(url,{method:'POST'})).status,401);
   assert.equal((await fetch(url,{method:'POST',headers:{Authorization:'Bearer invalido'}})).status,403);
   assert.equal((await fetch(url,{method:'POST',headers:{Authorization:'Bearer admin-valido','Content-Type':'application/json'},body:'{}'})).status,503);
  }
 });
});
test('rotas de chaves encaminham token e dados apenas a handler injetado',async()=>{
 const chamadas=[];
 await comServidor({verificarAdmin:async token=>token==='admin-valido',verificarMfaOperacao:async()=>true,operacoesChaves:{
  emitir:async entrada=>{chamadas.push(entrada);return {emitida:true};}
 }},async base=>{
  const r=await fetch(base+'/api/admin/chaves/emitir',{method:'POST',headers:{Authorization:'Bearer admin-valido','Content-Type':'application/json'},body:JSON.stringify({solicitacaoId:'900020',atestado:'atestado-sintetico-valido'})});
  assert.equal(r.status,200);
  assert.deepEqual(await r.json(),{emitida:true});
  assert.equal(chamadas[0].token,'admin-valido');
  assert.equal(chamadas[0].dados.solicitacaoId,'900020');
 });
});
