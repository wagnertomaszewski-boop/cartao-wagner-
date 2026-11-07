import {test} from 'node:test';
import assert from 'node:assert/strict';
import {iniciarHomologacao} from './iniciar-homologacao.mjs';

const base={MANDATO_AMBIENTE:'homologacao',HABILITAR_API_NEON:'sim',DATABASE_URL:'postgresql://usuario:senha@localhost:5432/testes'};
function simularPg(){
 const eventos=[];
 class Pool {
  async connect(){return {query:async(sql,parametros)=>{eventos.push([sql,parametros]);return {rows:[{status:'Recebido'}]};},release(){}};}
  async end(){}
 }
 return {eventos,carregarPg:async()=>({default:{Pool}})};
}
async function iniciar(env){
 const sim=simularPg();
 const instancia=await iniciarHomologacao({env,carregarPg:sim.carregarPg});
 await new Promise(resolve=>instancia.servidor.listen(0,'127.0.0.1',resolve));
 return {...instancia,eventos:sim.eventos,url:'http://127.0.0.1:'+instancia.servidor.address().port};
}
test('sem flag, rotas permanecem fechadas mesmo com conexão configurada',async()=>{
 const app=await iniciar(base);
 try{
  const resposta=await fetch(app.url+'/api/solicitacoes/consultar',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({protocolo:'TESTE',chave:'CHAVE'})});
  assert.equal(resposta.status,503);
  assert.equal(app.eventos.length,0);
 }finally{await app.fechar();}
});
test('flag habilita somente consultas e recuperação no banco fictício, nunca decisão',async()=>{
 const app=await iniciar({...base,HABILITAR_ROTAS_CIDADAO_TESTES:'sim'});
 try{
  const resposta=await fetch(app.url+'/api/solicitacoes/consultar',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({protocolo:'TESTE',chave:'CHAVE'})});
  assert.equal(resposta.status,200);
  assert.equal((await resposta.json()).resultado[0].status,'Recebido');
  assert.ok(app.eventos.some(([sql])=>sql==='SELECT * FROM mandato_testes.consulta_segura($1,$2)'));
  const recuperar=await fetch(app.url+'/api/recuperacao/solicitar',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({protocolo:'TESTE-000001',whatsapp:'51999990001'})});
  assert.equal(recuperar.status,200);
  assert.match((await recuperar.json()).mensagem,/analisado/);
  assert.ok(app.eventos.some(([sql])=>sql==='SELECT mandato_testes.pedir_recuperacao($1,$2)'));
  const decisao=await fetch(app.url+'/api/admin/recuperacoes/12/decisao',{method:'POST',headers:{Authorization:'Bearer TOKEN-FAKE','Content-Type':'application/json'},body:JSON.stringify({aprovar:true})});
  assert.equal(decisao.status,403);
  assert.equal(app.eventos.some(([sql])=>sql.includes('decidir_recuperacao')),false);
 }finally{await app.fechar();}
});
