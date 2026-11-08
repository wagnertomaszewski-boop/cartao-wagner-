import test from 'node:test';
import assert from 'node:assert/strict';
import {auditarPoliticaEmissao} from './auditar-politica-emissao.mjs';
test('funções antigas são detectadas sem alterar o banco',async()=>{
 const r=await auditarPoliticaEmissao({consultar:async()=>[{definicao:"AND decidido_em IS NOT NULL"}]});
 assert.equal(r.pronto,false);
 assert.deepEqual(r.resultado.map(x=>x.politica),['desatualizada','desatualizada']);
});
test('ambas as funções precisam exigir janela completa',async()=>{
 const r=await auditarPoliticaEmissao({consultar:async()=>[{definicao:"AND decidido_em >= now() - interval '24 hours' AND decidido_em <= now()"}]});
 assert.equal(r.pronto,true);
});
test('falha de leitura bloqueia prontidão',async()=>{
 const r=await auditarPoliticaEmissao({consultar:async()=>{throw Error('sem acesso')}});
 assert.equal(r.pronto,false);
});
