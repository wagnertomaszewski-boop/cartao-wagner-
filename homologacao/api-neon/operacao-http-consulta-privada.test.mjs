import {test} from 'node:test';
import assert from 'node:assert/strict';
import {criarServidor} from './server.mjs';
import {criarOperacaoHttpConsultaPrivada} from './operacao-http-consulta-privada.mjs';
import {emitirChavePrivada} from './chaves-privadas.mjs';

async function servidorLocal(operacoes,fn){
 const servidor=criarServidor({operacoes});
 await new Promise(resolve=>servidor.listen(0,'127.0.0.1',resolve));
 try {await fn('http://127.0.0.1:'+servidor.address().port);}
 finally {await new Promise(resolve=>servidor.close(resolve));}
}
async function consultar(base,protocolo,chave){
 const resposta=await fetch(base+'/api/solicitacoes/consultar',{
  method:'POST',headers:{'Content-Type':'application/json'},
  body:JSON.stringify({protocolo,chave})
 });
 return {status:resposta.status,corpo:await resposta.json(),headers:resposta.headers};
}
test('HTTP consulta válida usa hash parametrizado e remove dados pessoais',async()=>{
 const {chave,hash}=emitirChavePrivada();
 let chamadas=0;
 const operacao=criarOperacaoHttpConsultaPrivada({executar:async(sql,params)=>{
  chamadas++;
  assert.match(sql,/c\.revogada_em IS NULL/);
  assert.equal(params[0],'2026-000001');
  assert.deepEqual(params[1],hash);
  assert.equal(sql.includes(chave),false);
  return {rows:[{assunto:'Luz',status:'Recebido',nome:'SIGILOSO',whatsapp:'SIGILOSO'}]};
 }});
 await servidorLocal({consultar:operacao},async base=>{
  const r=await consultar(base,'2026-000001',chave);
  assert.equal(r.status,200);
  assert.deepEqual(r.corpo,{resultado:[{assunto:'Luz',status:'Recebido'}],respostas:[],historico:[],anexos:[]});
  assert.equal(r.headers.get('cache-control'),'no-store');
 });
 assert.equal(chamadas,1);
});
test('HTTP rejeita chave inválida sem acessar banco',async()=>{
 let chamadas=0;
 const operacao=criarOperacaoHttpConsultaPrivada({executar:async()=>{chamadas++;return {rows:[]};}});
 await servidorLocal({consultar:operacao},async base=>{
  const r=await consultar(base,'2026-000001','chave-curta');
  assert.equal(r.status,503);
  assert.deepEqual(r.corpo,{erro:'Operação indisponível'});
 });
 assert.equal(chamadas,0);
});
test('HTTP consulta sem registro retorna vazio e não revela existência',async()=>{
 const operacao=criarOperacaoHttpConsultaPrivada({executar:async()=>({rows:[]})});
 await servidorLocal({consultar:operacao},async base=>{
  const r=await consultar(base,'2026-000001',emitirChavePrivada().chave);
  assert.equal(r.status,200);
  assert.deepEqual(r.corpo,{resultado:[],respostas:[],historico:[],anexos:[]});
 });
});
test('servidor padrão sem adaptador permanece indisponível',async()=>{
 await servidorLocal({},async base=>{
  const r=await consultar(base,'2026-000001',emitirChavePrivada().chave);
  assert.equal(r.status,503);
 });
});
