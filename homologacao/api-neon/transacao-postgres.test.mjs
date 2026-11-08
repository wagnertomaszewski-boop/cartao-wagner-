import test from 'node:test';
import assert from 'node:assert/strict';
import {criarTransacionarPostgres} from './transacao-postgres.mjs';
test('transação confirma e libera conexão',async()=>{
 const sql=[];let liberado=false;
 const transacionar=criarTransacionarPostgres({connect:async()=>({query:async(q,args)=>{sql.push(q);return {rows:q==='SELECT 1'?[{valor:1}]:[]}},release:()=>{liberado=true}})});
 assert.deepEqual(await transacionar(async executar=>executar('SELECT 1',[])),[{valor:1}]);
 assert.deepEqual(sql,['BEGIN','SELECT 1','COMMIT']);
 assert.equal(liberado,true);
});
test('erro desfaz e libera conexão sem confirmar',async()=>{
 const sql=[];let liberado=false;
 const transacionar=criarTransacionarPostgres({connect:async()=>({query:async q=>{sql.push(q);if(q==='INSERT')throw Error('erro sintético');return {rows:[]}},release:()=>{liberado=true}})});
 await assert.rejects(()=>transacionar(executar=>executar('INSERT',[])),/erro sintético/);
 assert.deepEqual(sql,['BEGIN','INSERT','ROLLBACK']);
 assert.equal(liberado,true);
});
