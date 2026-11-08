import {test} from 'node:test';
import assert from 'node:assert/strict';
import {criarGravadorHashChave,SQL_GRAVAR_HASH_CHAVE} from './gravar-hash-chave.mjs';
import {criarEmissorChaves} from './emissao-chaves.mjs';
import {compararChavePrivada} from './chaves-privadas.mjs';
const operadorId='123e4567-e89b-42d3-a456-426614174000';
test('integra emissão com gravação parametrizada, sem expor chave em SQL',async()=>{
 const chamadas=[];
 const gravarHash=criarGravadorHashChave({executar:async(sql,params)=>{
  chamadas.push({sql,params});
  return {rowCount:1,rows:[{solicitacao_id:'12'}]};
 }});
 const emissor=criarEmissorChaves({verificarIdentidade:async()=>true,autorizarEmissao:async()=>true,gravarHash});
 const {chave}=await emissor.emitir({solicitacaoId:'12',operadorId,contextoServidor:{sessao:'homologacao'}});
 assert.equal(chamadas.length,1);
 assert.equal(chamadas[0].sql,SQL_GRAVAR_HASH_CHAVE);
 assert.deepEqual([chamadas[0].params[0],chamadas[0].params[2]],['12',operadorId]);
 assert.equal(compararChavePrivada(chave,chamadas[0].params[1]),true);
 assert.equal(chamadas[0].sql.includes(chave),false);
});
test('conflito não substitui chave já emitida nem devolve nova chave',async()=>{
 const gravarHash=criarGravadorHashChave({executar:async()=>({rowCount:0,rows:[]})});
 const emissor=criarEmissorChaves({verificarIdentidade:async()=>true,autorizarEmissao:async()=>true,gravarHash});
 await assert.rejects(emissor.emitir({solicitacaoId:'12',operadorId,contextoServidor:{sessao:true}}),/não concluída/);
 assert.match(SQL_GRAVAR_HASH_CHAVE,/ON CONFLICT \(solicitacao_id\) DO NOTHING/);
});
test('rejeita hash, id ou executor inválidos antes de SQL',async()=>{
 let chamadas=0;
 assert.throws(()=>criarGravadorHashChave({}),/obrigatório/);
 const gravarHash=criarGravadorHashChave({executar:async()=>{chamadas++;return {rowCount:1,rows:[{}]};}});
 for(const entrada of [
  {solicitacaoId:'12 OR true',operadorId,hash:Buffer.alloc(32)},
  {solicitacaoId:'12',operadorId:'invalido',hash:Buffer.alloc(32)},
  {solicitacaoId:'12',operadorId,hash:Buffer.alloc(31)},
  {solicitacaoId:'12',operadorId,hash:'hash'}
 ])await assert.rejects(gravarHash(entrada),/inválidos/);
 assert.equal(chamadas,0);
});
test('falha do banco é propagada e impede entrega de chave',async()=>{
 const gravarHash=criarGravadorHashChave({executar:async()=>{throw Error('banco indisponível');}});
 const emissor=criarEmissorChaves({verificarIdentidade:async()=>true,autorizarEmissao:async()=>true,gravarHash});
 await assert.rejects(emissor.emitir({solicitacaoId:'12',operadorId,contextoServidor:{sessao:true}}),/banco indisponível/);
});
