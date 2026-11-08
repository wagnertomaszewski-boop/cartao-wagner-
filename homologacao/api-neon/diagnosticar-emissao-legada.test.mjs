import test from 'node:test';
import assert from 'node:assert/strict';
import {diagnosticarEmissaoLegada} from './diagnosticar-emissao-legada.mjs';
test('emissor atual não é declarado pronto sem permissão de escrita',async()=>{
 const resultado=await diagnosticarEmissaoLegada({
  consultarNeon:async()=>[{chaves:false,acessos:false,auditoria:false}],
  fonteVinculoConectada:true,verificacaoIdentidadeConectada:true
 });
 assert.equal(resultado.pronto,false);
 assert.equal(resultado.requisitos.gravacaoDiretaPermitida,false);
});
test('fonte de identidade não conectada impede ativação',async()=>{
 const resultado=await diagnosticarEmissaoLegada({
  consultarNeon:async()=>[{chaves:true,acessos:true,auditoria:true}]
 });
 assert.equal(resultado.pronto,false);
 assert.equal(resultado.requisitos.verificacaoIdentidadeConectada,false);
});
test('erro de banco impede prontidão',async()=>{
 const resultado=await diagnosticarEmissaoLegada({consultarNeon:async()=>{throw Error('offline')}});
 assert.equal(resultado.pronto,false);
});
