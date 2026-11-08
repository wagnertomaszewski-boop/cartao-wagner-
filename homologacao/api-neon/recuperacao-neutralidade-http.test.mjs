import test from 'node:test';
import assert from 'node:assert/strict';
import {criarServidor} from './server.mjs';

async function executarCenario({resultadoRecuperacao},executar){
 const chamadas=[];
 const servidor=criarServidor({operacoes:{
  solicitar:async ({dados})=>{chamadas.push(dados);return resultadoRecuperacao;},
  consultar:async()=>({resultado:[],respostas:[],historico:[],anexos:[]})
 }});
 await new Promise(resolve=>servidor.listen(0,'127.0.0.1',resolve));
 const base='http://127.0.0.1:'+servidor.address().port;
 try{await executar({base,chamadas});}
 finally{await new Promise(resolve=>servidor.close(resolve));}
}
const dados={protocolo:'PROTOCOLO-FICTICIO-RECUPERACAO',whatsapp:'51999990000'};
const post=(base)=>fetch(base+'/api/recuperacao/solicitar',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(dados)});

test('recuperação repetida tem resposta pública neutra',async()=>{
 await executarCenario({resultadoRecuperacao:{mensagem:'Se os dados corresponderem, o pedido será analisado.'}},async({base,chamadas})=>{
  const respostas=[];
  for(let i=0;i<2;i++){
   const r=await post(base);
   assert.equal(r.status,200);
   respostas.push(await r.json());
  }
  assert.deepEqual(respostas[0],respostas[1]);
  assert.equal(chamadas.length,2);
  assert.ok(!JSON.stringify(respostas).includes(dados.whatsapp));
 });
});
test('endpoint de recuperação não expõe rotas automáticas de confirmação',async()=>{
 await executarCenario({resultadoRecuperacao:{mensagem:'Se os dados corresponderem, o pedido será analisado.'}},async({base})=>{
  for(const rota of ['/api/recuperacao/confirmar','/api/recuperacao/enviar-codigo']){
   const r=await fetch(base+rota,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...dados,codigo:'000000'})});
   assert.equal(r.status,404);
  }
 });
});
