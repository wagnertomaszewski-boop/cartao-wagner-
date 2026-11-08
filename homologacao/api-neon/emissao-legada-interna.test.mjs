import test from 'node:test';
import assert from 'node:assert/strict';
import {criarEmissorLegado} from './emissao-legada-interna.mjs';
test('emissor não pode ser criado sem verificadores e auditoria do servidor',()=>{
 assert.throws(()=>criarEmissorLegado({verificarIdentidade:async()=>({solicitacaoId:900003})}),/obrigatórias/);
});
test('declaração de identidade no cliente não libera chave',async()=>{
 let gravacoes=0;
 const emissor=criarEmissorLegado({
  verificarIdentidade:async()=>false,
  persistirHash:async()=>{gravacoes++;},
  auditar:async()=>{throw Error('não deveria auditar');}
 });
 await assert.rejects(()=>emissor.emitir({protocolo:'LEGADO-FICTICIO',comprovante:{identidadeVerificada:true,admin:true}}),/não confirmada/);
 assert.equal(gravacoes,0);
});
test('identidade verificada pelo servidor grava somente hash e audita',async()=>{
 let gravado,auditoria;
 const emissor=criarEmissorLegado({
  verificarIdentidade:async({protocolo})=>protocolo==='LEGADO-FICTICIO'?{solicitacaoId:900003}:false,
  persistirHash:async dados=>{gravado=dados;},
  auditar:async dados=>{auditoria=dados;}
 });
 const retorno=await emissor.emitir({protocolo:'LEGADO-FICTICIO',comprovante:'COMPROVANTE-FICTICIO'});
 assert.match(retorno.chave,/^[a-f0-9]{64}$/);
 assert.match(gravado.hash,/^[a-f0-9]{64}$/);
 assert.notEqual(retorno.chave,gravado.hash);
 assert.equal(gravado.chave,undefined);
 assert.equal(gravado.solicitacaoId,900003);
 assert.deepEqual(auditoria,{evento:'chave_legada_solicitada',protocolo:'LEGADO-FICTICIO'});
});
test('falha de persistência impede entrega da chave',async()=>{
 const emissor=criarEmissorLegado({
  verificarIdentidade:async()=>({solicitacaoId:900003}),
  persistirHash:async()=>{throw Error('falha sintética no banco');},
  auditar:async()=>{}
 });
 await assert.rejects(()=>emissor.emitir({protocolo:'LEGADO-FICTICIO'}),/falha sintética/);
});

test('falha na auditoria bloqueia persistência e entrega da chave',async()=>{
 let gravacoes=0;
 const emissor=criarEmissorLegado({
  verificarIdentidade:async()=>({solicitacaoId:900003}),
  persistirHash:async()=>{gravacoes++;},
  auditar:async()=>{throw Error('auditoria indisponível');}
 });
 await assert.rejects(()=>emissor.emitir({protocolo:'LEGADO-FICTICIO'}),/auditoria indisponível/);
 assert.equal(gravacoes,0);
});
test('auditoria antecede a gravação do hash',async()=>{
 const ordem=[];
 const emissor=criarEmissorLegado({
  verificarIdentidade:async()=>{ordem.push('identidade');return {solicitacaoId:900003};},
  persistirHash:async()=>{ordem.push('persistencia');},
  auditar:async()=>{ordem.push('auditoria');}
 });
 await emissor.emitir({protocolo:'LEGADO-FICTICIO'});
 assert.deepEqual(ordem,['identidade','auditoria','persistencia']);
});
test('identificador inválido da verificação do servidor não grava nem audita',async()=>{
 let efeitos=0;
 const emissor=criarEmissorLegado({
  verificarIdentidade:async()=>({solicitacaoId:'900003'}),
  persistirHash:async()=>{efeitos++;},
  auditar:async()=>{efeitos++;}
 });
 await assert.rejects(()=>emissor.emitir({protocolo:'LEGADO-FICTICIO'}),/Identidade não confirmada/);
 assert.equal(efeitos,0);
});
