import test from 'node:test';
import assert from 'node:assert/strict';
import {iniciarHomologacao} from './iniciar-homologacao.mjs';

// A API de homologação não pode habilitar decisões administrativas por configuração.
test('inicialização real mantém decisões administrativas sem handler mesmo com sessão simulada',async()=>{
 let chamadasBanco=0;
 class Pool {
  async connect(){chamadasBanco++;throw Error('Nenhuma consulta administrativa deve ser executada');}
  async end(){}
 }
 const instancia=await iniciarHomologacao({
  env:{MANDATO_AMBIENTE:'homologacao',HABILITAR_API_NEON:'sim',HABILITAR_ROTAS_CIDADAO_TESTES:'sim',DATABASE_URL:'postgresql://usuario:senha@localhost:5432/testes'},
  carregarPg:async()=>({default:{Pool}})
 });
 await new Promise(resolve=>instancia.servidor.listen(0,'127.0.0.1',resolve));
 try{
  const base='http://127.0.0.1:'+instancia.servidor.address().port;
  const lista=await fetch(base+'/api/admin/recuperacoes',{headers:{Authorization:'Bearer token-ficticio'}});
  assert.equal(lista.status,403);
  const decisao=await fetch(base+'/api/admin/recuperacoes/1/decisao',{
   method:'POST',
   headers:{Authorization:'Bearer token-ficticio','Content-Type':'application/json'},
   body:'{"aprovar":true}'
  });
  assert.equal(decisao.status,403);
  assert.equal(chamadasBanco,0);
 }finally{await instancia.fechar();}
});
test('origem de terceiros não consegue consultar nem solicitar recuperação',async()=>{
 let chamadasBanco=0;
 class Pool {
  async connect(){chamadasBanco++;throw Error('CORS deve bloquear antes de acessar o banco');}
  async end(){}
 }
 const instancia=await iniciarHomologacao({
  env:{MANDATO_AMBIENTE:'homologacao',HABILITAR_API_NEON:'sim',HABILITAR_ROTAS_CIDADAO_TESTES:'sim',DATABASE_URL:'postgresql://usuario:senha@localhost:5432/testes',ORIGEM_PAINEL_HOMOLOGACAO:'https://wagnertomaszewski-boop.github.io'},
  carregarPg:async()=>({default:{Pool}})
 });
 await new Promise(resolve=>instancia.servidor.listen(0,'127.0.0.1',resolve));
 try{
  const base='http://127.0.0.1:'+instancia.servidor.address().port;
  for(const rota of ['/api/recuperacao/solicitar','/api/solicitacoes/consultar']){
   const resposta=await fetch(base+rota,{
    method:'POST',headers:{Origin:'https://origem-maliciosa.invalid','Content-Type':'application/json'},body:'{}'
   });
   assert.equal(resposta.status,403);
   assert.equal(resposta.headers.get('access-control-allow-origin'),null);
  }
  assert.equal(chamadasBanco,0);
 }finally{await instancia.fechar();}
});
