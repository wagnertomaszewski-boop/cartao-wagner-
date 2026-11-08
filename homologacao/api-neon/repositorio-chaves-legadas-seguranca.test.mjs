import test from 'node:test';
import assert from 'node:assert/strict';
import {criarRepositorioChavesLegadas} from './repositorio-chaves-legadas.mjs';
test('protocolo já existente impede inserts mesmo com espaços externos',async()=>{
 const consultas=[];let insercoes=0;
 const repositorio=criarRepositorioChavesLegadas({transacionar:async fn=>fn(async(sql,args)=>{
  consultas.push({sql,args});
  if(sql.startsWith('INSERT')){insercoes++;return []}
  if(sql.includes('FROM mandato_testes.chaves_legadas'))return [{existe:1}];
  return [];
 })});
 await assert.rejects(()=>repositorio.persistirHash({
  protocolo:'  LEGADO-TESTE  ',hash:'a'.repeat(64),solicitacaoId:900004
 }),/já possui chave/);
 assert.equal(insercoes,0);
 assert.equal(consultas[0].args[0],'LEGADO-TESTE');
 assert.equal(consultas[1].args[0],'LEGADO-TESTE');
});
test('hash inválido não inicia transação',async()=>{
 let transacoes=0;
 const repositorio=criarRepositorioChavesLegadas({transacionar:async()=>{transacoes++}});
 await assert.rejects(()=>repositorio.persistirHash({protocolo:'P',hash:'texto',solicitacaoId:1}),/Dados inválidos/);
 assert.equal(transacoes,0);
});
