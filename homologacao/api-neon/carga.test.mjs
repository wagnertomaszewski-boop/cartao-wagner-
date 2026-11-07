import {test} from 'node:test';
import assert from 'node:assert/strict';
import {criarServidor} from './server.mjs';

test('25 consultas simultâneas: limita sem executar chamadas excedentes',async()=>{
 let chamadas=0;
 const servidor=criarServidor({operacoes:{consultar:async()=>{chamadas++;return {resultado:[]};}}});
 await new Promise(resolve=>servidor.listen(0,'127.0.0.1',resolve));
 try{
  const url='http://127.0.0.1:'+servidor.address().port+'/api/solicitacoes/consultar';
  const respostas=await Promise.all(Array.from({length:25},()=>fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({protocolo:'FICTICIO',chave:'a'.repeat(64)})})));
  assert.equal(respostas.filter(r=>r.status===200).length,5);
  assert.equal(respostas.filter(r=>r.status===429).length,20);
  assert.equal(chamadas,5);
 }finally{await new Promise(resolve=>servidor.close(resolve));}
});

test('falha de banco não devolve detalhes internos',async()=>{
 const servidor=criarServidor({operacoes:{consultar:async()=>{throw Error('segredo-ficticio-banco');}}});
 await new Promise(resolve=>servidor.listen(0,'127.0.0.1',resolve));
 try{
  const url='http://127.0.0.1:'+servidor.address().port+'/api/solicitacoes/consultar';
  const resposta=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
  assert.equal(resposta.status,503);
  assert.ok(!(await resposta.text()).includes('segredo-ficticio-banco'));
 }finally{await new Promise(resolve=>servidor.close(resolve));}
});
