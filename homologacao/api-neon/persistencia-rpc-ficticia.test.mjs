import test from 'node:test';
import assert from 'node:assert/strict';
import {criarPersistenciaRpcFicticia} from './persistencia-rpc-ficticia.mjs';
test('RPC fixa por protocolo e ID fictício',async()=>{
 let chamada;
 const persistir=criarPersistenciaRpcFicticia({consultar:async(sql,args)=>{chamada={sql,args};return [{emitido:true}]}});
 assert.deepEqual(await persistir({protocolo:'LEGADO-EMISSAO-TESTE-900005',solicitacaoId:900005,hash:'a'.repeat(64)}),{gravado:true});
 assert.match(chamada.sql,/emitir_chave_legada_teste_900005\(\$1,\$2,\$3\)/);
 assert.deepEqual(chamada.args,['LEGADO-EMISSAO-TESTE-900005',900005,'a'.repeat(64)]);
});
test('protocolo não autorizado e ID divergente nunca consultam o banco',async()=>{
 let chamadas=0;
 const persistir=criarPersistenciaRpcFicticia({consultar:async()=>{chamadas++;return [{emitido:true}]}});
 for(const dados of [
  {protocolo:'OUTRO',solicitacaoId:900005,hash:'a'.repeat(64)},
  {protocolo:'LEGADO-EMISSAO-TESTE-900005',solicitacaoId:900004,hash:'a'.repeat(64)},
  {protocolo:'LEGADO-EMISSAO-TESTE-900005',solicitacaoId:900005,hash:'invalido'}
 ])await assert.rejects(()=>persistir(dados));
 assert.equal(chamadas,0);
});
test('resposta inesperada não confirma emissão',async()=>{
 const persistir=criarPersistenciaRpcFicticia({consultar:async()=>[{emitido:false}]});
 await assert.rejects(()=>persistir({protocolo:'LEGADO-EMISSAO-TESTE-900004',solicitacaoId:900004,hash:'b'.repeat(64)}),/não confirmada/);
});
