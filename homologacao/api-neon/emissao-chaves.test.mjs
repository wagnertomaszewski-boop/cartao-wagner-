import {test} from 'node:test';
import assert from 'node:assert/strict';
import {criarEmissorChaves} from './emissao-chaves.mjs';
import {compararChavePrivada} from './chaves-privadas.mjs';
const id='12', operador='123e4567-e89b-42d3-a456-426614174000',contextoServidor=Object.freeze({sessaoVerificada:true});
const dados={solicitacaoId:id,operadorId:operador,contextoServidor};

test('nega emissão sem identidade confirmada pelo servidor e não grava',async()=>{
 let gravacoes=0,autorizacoes=0;
 const emissor=criarEmissorChaves({verificarIdentidade:async()=>false,autorizarEmissao:async()=>{autorizacoes++;return true},gravarHash:async()=>{gravacoes++;return true}});
 await assert.rejects(emissor.emitir(dados),/não autorizada/);
 assert.equal(autorizacoes,0);assert.equal(gravacoes,0);
});
test('nega emissão sem autorização independente e não grava',async()=>{
 let gravacoes=0;
 const emissor=criarEmissorChaves({verificarIdentidade:async()=>true,autorizarEmissao:async()=>false,gravarHash:async()=>{gravacoes++;return true}});
 await assert.rejects(emissor.emitir(dados),/não autorizada/);
 assert.equal(gravacoes,0);
});
test('emite chave apenas depois de gravar hash, sem retornar hash ao cidadão',async()=>{
 let salvo,ordem=[];
 const emissor=criarEmissorChaves({verificarIdentidade:async()=>{ordem.push('identidade');return true},autorizarEmissao:async()=>{ordem.push('autorizacao');return true},gravarHash:async payload=>{ordem.push('gravacao');salvo=payload;return true}});
 const resposta=await emissor.emitir(dados);
 assert.deepEqual(ordem,['identidade','autorizacao','gravacao']);
 assert.deepEqual(Object.keys(resposta),['chave']);
 assert.equal(compararChavePrivada(resposta.chave,salvo.hash),true);
 assert.equal(salvo.operadorId,operador);
 assert.equal(salvo.solicitacaoId,id);
});
test('falha de gravação impede entrega da chave',async()=>{
 const emissor=criarEmissorChaves({verificarIdentidade:async()=>true,autorizarEmissao:async()=>true,gravarHash:async()=>false});
 await assert.rejects(emissor.emitir(dados),/não concluída/);
});
test('não permite identificador adulterado ou verificação não configurada',async()=>{
 assert.throws(()=>criarEmissorChaves({}),/obrigatórios/);
 const emissor=criarEmissorChaves({verificarIdentidade:async()=>true,autorizarEmissao:async()=>true,gravarHash:async()=>true});
 await assert.rejects(emissor.emitir({...dados,solicitacaoId:'12 OR 1=1'}),/inválidos/);
 await assert.rejects(emissor.emitir({...dados,operadorId:'não é uuid'}),/inválidos/);
});
