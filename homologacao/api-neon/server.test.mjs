import {test} from 'node:test';
import assert from 'node:assert/strict';
import {criarServidor} from './server.mjs';

test('API de homologação não expõe dados nem permite recuperação antes da integração',async()=>{
 const server=criarServidor(); await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{
  const base='http://127.0.0.1:'+server.address().port;
  const health=await fetch(base+'/health');
  assert.equal(health.status,200);
  assert.equal((await health.json()).modo,'homologacao-sem-banco');
  for(const [path,method] of [['/api/recuperacao/solicitar','POST'],['/api/admin/recuperacoes','GET'],['/api/admin/recuperacoes/1/decisao','POST'],['/api/solicitacoes/consultar','POST']]){
   const r=await fetch(base+path,{method});
   assert.equal(r.status,503);
   assert.equal(r.headers.get('cache-control'),'no-store');
   assert.ok(!(await r.text()).includes('chave'));
  }
  assert.equal((await fetch(base+'/nao-existe')).status,404);
 } finally {await new Promise((resolve,reject)=>server.close(err=>err?reject(err):resolve()));}
});
