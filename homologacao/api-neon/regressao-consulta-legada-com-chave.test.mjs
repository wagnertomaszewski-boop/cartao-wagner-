import {test} from 'node:test';
import assert from 'node:assert/strict';
import {criarServidor} from './server.mjs';
import {criarOperacoesNeon} from './operacoes-neon.mjs';

async function comServidor(operacoes, executar) {
 const servidor=criarServidor({operacoes});
 await new Promise(resolve=>servidor.listen(0,'127.0.0.1',resolve));
 try {await executar('http://127.0.0.1:'+servidor.address().port);}
 finally {await new Promise(resolve=>servidor.close(resolve));}
}
const consultar=(base,dados)=>fetch(base+'/api/solicitacoes/consultar',{
 method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(dados)
});

test('sem chave privada a API nunca consulta banco nem revela dados de protocolo legado',async()=>{
 const chamadas=[];
 const operacoes=criarOperacoesNeon({
  executarCidadao:async(sql,parametros)=>{chamadas.push({sql,parametros});return [{assunto:'PRIVADO',status:'Em andamento'}];},
  executarAdmin:async()=>{throw Error('admin nao autorizado');}
 });
 await comServidor({consultar:operacoes.consultar},async base=>{
  for(const dados of [{protocolo:'2026-000001'},{protocolo:'2026-000001',chave:''},{protocolo:'2026-000001',chave:'curta'}]){
   const resposta=await consultar(base,dados);
   assert.equal(resposta.status,503);
   const corpo=await resposta.text();
   assert.ok(!corpo.includes('PRIVADO'));
   assert.ok(!corpo.includes('Em andamento'));
  }
 });
 assert.equal(chamadas.length,0);
});

test('protocolo com chave incorreta não aciona funções de histórico, respostas ou anexos',async()=>{
 const chamadas=[];
 const operacoes=criarOperacoesNeon({
  executarCidadao:async(sql,parametros)=>{chamadas.push({sql,parametros});return [];},
  executarAdmin:async()=>[]
 });
 await comServidor({consultar:operacoes.consultar},async base=>{
  const resposta=await consultar(base,{protocolo:'2026-000001',chave:'x'.repeat(64)});
  assert.equal(resposta.status,200);
  assert.deepEqual(await resposta.json(),{resultado:[],respostas:[],historico:[],anexos:[]});
  assert.equal(resposta.headers.get('cache-control'),'no-store');
 });
 assert.deepEqual(chamadas,[{sql:'SELECT * FROM mandato_testes.consulta_segura($1,$2)',parametros:['2026-000001','x'.repeat(64)]}]);
});

test('sem chave não existe rota GET alternativa para consulta de protocolo',async()=>{
 let chamadas=0;
 await comServidor({consultar:async()=>{chamadas++;return {segredo:'NÃO EXPOR'};}},async base=>{
  for(const url of ['/api/solicitacoes/consultar?protocolo=2026-000001','/api/solicitacoes/2026-000001','/api/protocolo/2026-000001']){
   const resposta=await fetch(base+url);
   assert.equal(resposta.status,404);
   assert.ok(!(await resposta.text()).includes('NÃO EXPOR'));
  }
 });
 assert.equal(chamadas,0);
});
