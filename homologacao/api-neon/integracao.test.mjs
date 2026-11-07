import {test} from 'node:test';
import assert from 'node:assert/strict';
import {criarServidor} from './server.mjs';
import {criarOperacoesNeon} from './operacoes-neon.mjs';

test('fluxo HTTP integrado com executores simulados e sem credenciais',async()=>{
 const chamadas=[];
 const operacoes=criarOperacoesNeon({
  executarCidadao:async(sql,params)=>{chamadas.push({papel:'cidadao',sql,params});if(sql.includes('consulta_segura'))return [{assunto:'Teste',status:'Recebido'}];return [];},
  executarAdmin:async(sql,params)=>{chamadas.push({papel:'admin',sql,params});return [{chave:'a'.repeat(64)}];}
 });
 const servidor=criarServidor({verificarAdmin:async token=>token==='TOKEN-FICTICIO',verificarIdentidade:async ({pedidoId})=>pedidoId==='12',operacoes});
 await new Promise(resolve=>servidor.listen(0,'127.0.0.1',resolve));
 const base='http://127.0.0.1:'+servidor.address().port;
 const enviar=(rota,dados,token)=>fetch(base+rota,{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(dados)});
 try{
  const pedido=await enviar('/api/recuperacao/solicitar',{protocolo:' TESTE-000001 ',whatsapp:'51999990001'});
  assert.equal(pedido.status,200);
  assert.match((await pedido.json()).mensagem,/analisado/);
  const consulta=await enviar('/api/solicitacoes/consultar',{protocolo:'TESTE-000001',chave:'CHAVE-FICTICIA'});
  assert.equal(consulta.status,200);
  assert.equal((await consulta.json()).resultado[0].status,'Recebido');
  const rota='/api/admin/recuperacoes/12/decisao';
  assert.equal((await enviar(rota,{aprovar:true,identidadeConfirmada:true})).status,401);
  assert.equal((await enviar(rota,{aprovar:true,identidadeConfirmada:true},'ERRADO')).status,403);
  const aprovado=await enviar(rota,{aprovar:true,identidadeConfirmada:false},'TOKEN-FICTICIO');
  assert.equal(aprovado.status,200);
  assert.equal((await aprovado.json()).resultado[0].chave,'CHAVE-FICTICIA');
  assert.equal(chamadas.length,6);
  assert.equal(chamadas[0].papel,'cidadao');
  assert.deepEqual(chamadas[0].params,['TESTE-000001','51999990001']);
  assert.equal(chamadas[5].papel,'admin');
  assert.equal(chamadas[5].sql,'SELECT * FROM mandato_testes.decidir_recuperacao($1,$2)');
 } finally {await new Promise(resolve=>servidor.close(resolve));}
});
