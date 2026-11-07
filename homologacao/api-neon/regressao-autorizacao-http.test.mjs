import {test} from 'node:test';
import assert from 'node:assert/strict';
import {criarServidor} from './server.mjs';

async function comServidor(opcoes,executar){
 const servidor=criarServidor(opcoes);
 await new Promise(resolve=>servidor.listen(0,'127.0.0.1',resolve));
 try {return await executar('http://127.0.0.1:'+servidor.address().port);}
 finally {await new Promise(resolve=>servidor.close(resolve));}
}
const post=(base,rota,body,headers={})=>fetch(base+rota,{method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(body)});

test('cabeçalho X-Forwarded-For não troca identidade do limitador',async()=>{
 let consultas=0;
 const limitador={verificar(chave){assert.match(chave,/consultar$/);consultas++;return consultas===1;}};
 await comServidor({limitador,operacoes:{consultar:async()=>({resultado:[]})}},async(base)=>{
  const rota='/api/solicitacoes/consultar';
  assert.equal((await post(base,rota,{protocolo:'FICTICIO',chave:'x'},{'X-Forwarded-For':'1.1.1.1'})).status,200);
  assert.equal((await post(base,rota,{protocolo:'FICTICIO',chave:'x'},{'X-Forwarded-For':'2.2.2.2'})).status,429);
  assert.equal(consultas,2);
 });
});

test('nega decisão administrativa quando identidade falha mesmo com admin autorizado',async()=>{
 let decisoes=0;
 await comServidor({verificarAdmin:async()=>true,verificarIdentidade:async()=>false,operacoes:{decidir:async()=>{decisoes++;return {ok:true};}}},async(base)=>{
  const r=await post(base,'/api/admin/recuperacoes/12/decisao',{aprovar:true},{Authorization:'Bearer token-ficticio'});
  assert.equal(r.status,403);
  assert.equal(decisoes,0);
 });
});

test('nega acesso administrativo quando verificador de token lança erro',async()=>{
 let listagens=0;
 await comServidor({verificarAdmin:async()=>{throw Error('indisponível');},operacoes:{listar:async()=>{listagens++;return [];}}},async(base)=>{
  const r=await fetch(base+'/api/admin/recuperacoes',{headers:{Authorization:'Bearer token-ficticio'}});
  assert.equal(r.status,403);
  assert.equal(listagens,0);
 });
});
