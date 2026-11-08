import {test} from 'node:test';
import assert from 'node:assert/strict';
import {iniciarHomologacao} from './iniciar-homologacao.mjs';
import {emitirChavePrivada} from './chaves-privadas.mjs';
import {SQL_RPC_CONSULTA_HOMOLOGACAO} from './consulta-rpc-homologacao.mjs';
const base={MANDATO_AMBIENTE:'homologacao',HABILITAR_API_NEON:'sim',DATABASE_URL:'postgresql://usuario:senha@localhost:5432/testes'};
test('HTTP real chama RPC parametrizada e não retorna PII (pool simulado)',async()=>{
 const {chave,hash}=emitirChavePrivada();
 let chamadas=0,fechou=false;
 class Pool {
  async query(sql,params){
   chamadas++;
   assert.equal(sql,SQL_RPC_CONSULTA_HOMOLOGACAO);
   assert.deepEqual(params,['TESTE-900010',hash]);
   return {rows:[{assunto:'Teste',status:'Recebido',nome:'NÃO EXIBIR'}]};
  }
  async connect(){throw Error('Não deve usar operações antigas');}
  async end(){fechou=true;}
 }
 const instancia=await iniciarHomologacao({env:{...base,HABILITAR_CONSULTA_PRIVADA_HOMOLOGACAO:'sim'},carregarPg:async()=>({default:{Pool}})});
 await new Promise(resolve=>instancia.servidor.listen(0,'127.0.0.1',resolve));
 try{
  const url='http://127.0.0.1:'+instancia.servidor.address().port;
  const resposta=await fetch(url+'/api/solicitacoes/consultar',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({protocolo:'TESTE-900010',chave})});
  assert.equal(resposta.status,200);
  assert.deepEqual(await resposta.json(),{resultado:[{assunto:'Teste',status:'Recebido'}],respostas:[],historico:[],anexos:[]});
  const invalida=await fetch(url+'/api/solicitacoes/consultar',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({protocolo:'TESTE-900010',chave:'errada'})});
  assert.equal(invalida.status,503);
  assert.equal(chamadas,1);
  const antiga=await fetch(url+'/api/recuperacao/solicitar',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
  assert.equal(antiga.status,503);
 }finally{await instancia.fechar();}
 assert.equal(fechou,true);
});
test('não mistura rotas antigas com modo privado e fecha pool',async()=>{
 let fechou=false;
 class Pool {async end(){fechou=true;} async connect(){throw Error('não deveria conectar');}}
 await assert.rejects(iniciarHomologacao({env:{...base,HABILITAR_CONSULTA_PRIVADA_HOMOLOGACAO:'sim',HABILITAR_ROTAS_CIDADAO_TESTES:'sim'},carregarPg:async()=>({default:{Pool}})}),/mutuamente exclusivos/);
 assert.equal(fechou,true);
});
