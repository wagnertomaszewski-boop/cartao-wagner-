import {test} from 'node:test';
import assert from 'node:assert/strict';
import {criarServidor} from './server.mjs';

test('HTTP separa dois protocolos fictícios por chave e não expõe dados cruzados',async()=>{
 const dados=new Map([['FICTICIO-A',{chave:'a'.repeat(64),nome:'Pessoa A'}],['FICTICIO-B',{chave:'b'.repeat(64),nome:'Pessoa B'}]]);
 const servidor=criarServidor({operacoes:{solicitar:async()=>({mensagem:'ok'}),consultar:async({dados:entrada})=>{
 const item=dados.get(entrada.protocolo);
 if(!item||item.chave!==entrada.chave)return {resultado:[]};
 return {resultado:[{nome:item.nome}]};
 }}});
 await new Promise(resolve=>servidor.listen(0,'127.0.0.1',resolve));
 const url='http://127.0.0.1:'+servidor.address().port+'/api/solicitacoes/consultar';
 const consultar=async(protocolo,chave)=>{const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({protocolo,chave})});assert.equal(r.status,200);return r.json()};
 try{
  assert.deepEqual((await consultar('FICTICIO-A','a'.repeat(64))).resultado,[{nome:'Pessoa A'}]);
  assert.deepEqual((await consultar('FICTICIO-B','b'.repeat(64))).resultado,[{nome:'Pessoa B'}]);
  assert.deepEqual((await consultar('FICTICIO-A','b'.repeat(64))).resultado,[]);
  assert.deepEqual((await consultar('FICTICIO-B','a'.repeat(64))).resultado,[]);
 }finally{await new Promise(resolve=>servidor.close(resolve));}
});
