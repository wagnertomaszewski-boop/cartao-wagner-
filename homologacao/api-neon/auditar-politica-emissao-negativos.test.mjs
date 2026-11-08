import test from 'node:test';
import assert from 'node:assert/strict';
import {auditarPoliticaEmissao} from './auditar-politica-emissao.mjs';

test('auditoria usa parametros SQL e somente SELECT para as duas funcoes',async()=>{
 const chamadas=[];
 const resultado=await auditarPoliticaEmissao({consultar:async(sql,parametros)=>{
  chamadas.push({sql,parametros});
  return [{definicao:"AND decidido_em >= now() - interval '24 hours' AND decidido_em <= now()"}];
 }});
 assert.equal(resultado.pronto,true);
 assert.equal(chamadas.length,2);
 for(const {sql,parametros} of chamadas){
  assert.match(sql,/^SELECT\s/i);
  assert.match(sql,/p\.proname=\$1/);
  assert.equal(parametros.length,1);
  assert.match(parametros[0],/^emitir_chave_legada_teste_90000[45]$/);
 }
});
test('funcao ausente nao autoriza emissao',async()=>{
 const r=await auditarPoliticaEmissao({consultar:async()=>[]});
 assert.equal(r.pronto,false);
 assert.deepEqual(r.resultado.map(x=>x.politica),['indisponivel','indisponivel']);
});
test('assinaturas ambiguas nao autorizam emissao',async()=>{
 const definicao="AND decidido_em >= now() - interval '24 hours' AND decidido_em <= now()";
 const r=await auditarPoliticaEmissao({consultar:async()=>[{definicao},{definicao}]});
 assert.equal(r.pronto,false);
});
test('aprovacao futura nao autoriza emissao',async()=>{
 const r=await auditarPoliticaEmissao({consultar:async()=>[{definicao:"AND decidido_em >= now() - interval '24 hours'"}]});
 assert.equal(r.pronto,false);
});
test('divergencia de uma funcao bloqueia prontidao geral',async()=>{
 let n=0;
 const r=await auditarPoliticaEmissao({consultar:async()=>[{definicao:++n===1?"AND decidido_em >= now() - interval '24 hours' AND decidido_em <= now()":"AND decidido_em IS NOT NULL"}]});
 assert.equal(r.pronto,false);
 assert.deepEqual(r.resultado.map(x=>x.politica),['atualizada','desatualizada']);
});
