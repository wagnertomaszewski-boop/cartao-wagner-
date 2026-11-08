import test from 'node:test';
import assert from 'node:assert/strict';
import {avaliarProntidaoMigracao,requisitosMigracao} from './prontidao-migracao.mjs';
test('implantação permanece bloqueada sem evidências de produção',()=>{
 const r=avaliarProntidaoMigracao();
 assert.equal(r.apto,false);
 assert.deepEqual(r.pendentes,requisitosMigracao);
});
test('testes de homologação não substituem acesso aos protocolos antigos',()=>{
 const evidencias=Object.fromEntries(requisitosMigracao.map(x=>[x,true]));
 evidencias.protocolos_legados_acessiveis_com_chave=false;
 assert.equal(avaliarProntidaoMigracao(evidencias).apto,false);
 assert.deepEqual(avaliarProntidaoMigracao(evidencias).pendentes,['protocolos_legados_acessiveis_com_chave']);
});
test('cada requisito exige confirmação booleana explícita',()=>{
 const evidencias=Object.fromEntries(requisitosMigracao.map(x=>[x,true]));
 assert.equal(avaliarProntidaoMigracao(evidencias).apto,true);
 evidencias.aprovacao_explicita_implantacao='sim';
 assert.equal(avaliarProntidaoMigracao(evidencias).apto,false);
});
