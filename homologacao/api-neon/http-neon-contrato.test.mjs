import {test} from 'node:test';
import assert from 'node:assert/strict';
import {criarServidor} from './server.mjs';
import {criarOperacoesNeon} from './operacoes-neon.mjs';

async function servidorLocal(opcoes, executar) {
  const servidor=criarServidor(opcoes);
  await new Promise(resolve=>servidor.listen(0,'127.0.0.1',resolve));
  try { await executar(`http://127.0.0.1:${servidor.address().port}`); }
  finally { await new Promise(resolve=>servidor.close(resolve)); }
}

test('HTTP consulta passa parâmetros ao adaptador SQL e não expõe linhas sem chave', async()=>{
  const chamadas=[];
  const operacoes=criarOperacoesNeon({
    executarCidadao:async (sql,parametros)=>{ chamadas.push({sql,parametros});return []; },
    executarAdmin:async()=>{throw Error('admin nao permitido');}
  });
  await servidorLocal({operacoes:{consultar:operacoes.consultar}},async base=>{
    const resposta=await fetch(base+'/api/solicitacoes/consultar',{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({protocolo:'PROTOCOLO-FICTICIO',chave:'chave-ficticia-com-mais-de-trinta-e-dois-caracteres'})
    });
    assert.equal(resposta.status,200);
    assert.deepEqual(await resposta.json(),{resultado:[],respostas:[],historico:[],anexos:[]});
  });
  assert.equal(chamadas.length,1);
  assert.equal(chamadas[0].sql,'SELECT * FROM mandato_testes.consulta_segura($1,$2)');
  assert.deepEqual(chamadas[0].parametros,['PROTOCOLO-FICTICIO','chave-ficticia-com-mais-de-trinta-e-dois-caracteres']);
});

test('HTTP nega decisão administrativa mesmo com handler injetado sem confirmação de identidade',async()=>{
 let chamadas=0;
 await servidorLocal({verificarAdmin:async()=>true,operacoes:{decidir:async()=>{chamadas++;return {};}}},async base=>{
  const resposta=await fetch(base+'/api/admin/recuperacoes/42/decisao',{
   method:'POST',headers:{Authorization:'Bearer token-ficticio','Content-Type':'application/json'},body:JSON.stringify({aprovar:true})
  });
  assert.equal(resposta.status,403);
 });
 assert.equal(chamadas,0);
});
