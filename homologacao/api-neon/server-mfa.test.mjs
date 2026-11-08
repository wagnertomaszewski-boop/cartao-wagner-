import test from 'node:test';
import assert from 'node:assert/strict';
import {criarServidor} from './server.mjs';
const token='sessao-administrativa-teste';
async function requisitar(porta,caminho){
 const resposta=await fetch('http://127.0.0.1:'+porta+caminho,{
  method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
  body:JSON.stringify({solicitacaoId:'1'}),signal:AbortSignal.timeout(3000)
 });
 return {status:resposta.status,corpo:await resposta.json()};
}
test('rotas de chaves e recuperação bloqueiam sem MFA mesmo com administrador autenticado',async()=>{
 let chamadas=0;
 const servidor=criarServidor({
  verificarAdmin:async()=>true,
  verificarMfaOperacao:async()=>false,
  operacoesChaves:{emitir:async()=>{chamadas++;return {ok:true};},revogar:async()=>{chamadas++;return {ok:true};}},
  iniciarRecuperacao:async()=>{chamadas++;return {ok:true};},
  concluirRecuperacao:async()=>{chamadas++;return {ok:true};}
 });
 await new Promise(resolve=>servidor.listen(0,'127.0.0.1',resolve));
 try{
  const porta=servidor.address().port;
  for(const caminho of ['/api/admin/chaves/emitir','/api/admin/chaves/revogar','/api/admin/chaves/iniciar-confirmacao','/api/admin/chaves/concluir-recuperacao']){
   const resultado=await requisitar(porta,caminho);
   assert.equal(resultado.status,403);
   assert.match(resultado.corpo.erro,/MFA/);
  }
  assert.equal(chamadas,0);
 }finally{await new Promise(resolve=>servidor.close(resolve));}
});
test('rota sensível só chama executor após verificação MFA explícita',async()=>{
 let chamadas=0;
 const servidor=criarServidor({verificarAdmin:async()=>true,verificarMfaOperacao:async()=>true,
  operacoesChaves:{emitir:async()=>{chamadas++;return {ok:true};}}});
 await new Promise(resolve=>servidor.listen(0,'127.0.0.1',resolve));
 try{
  const resultado=await requisitar(servidor.address().port,'/api/admin/chaves/emitir');
  assert.equal(resultado.status,200);
  assert.equal(chamadas,1);
 }finally{await new Promise(resolve=>servidor.close(resolve));}
});
