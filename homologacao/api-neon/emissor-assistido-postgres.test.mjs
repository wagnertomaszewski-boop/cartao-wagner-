import test from 'node:test';
import assert from 'node:assert/strict';
import {criarEmissorAssistidoPostgres} from './emissor-assistido-postgres.mjs';
test('emissor assistido consulta aprovacao no banco e grava chave com auditoria',async()=>{
 const consultas=[];let liberacoes=0;
 const pool={connect:async()=>({
  query:async(sql,args)=>{
   consultas.push({sql,args});
   if(sql.includes('FROM mandato_testes.pedidos_recuperacao'))return {rows:[{id:101}]};
   if(sql.includes('FROM mandato_testes.solicitacoes'))return {rows:[{id:900004}]};
   return {rows:[]};
  },
  release:()=>{liberacoes++}
 })};
 const emissor=criarEmissorAssistidoPostgres({
  pool,
  validarComprovante:async()=>true,
  buscarVinculo:async()=>({protocolo:'LEGADO-TESTE',solicitacaoId:900004}),
  auditarTentativa:async()=>{}
 });
 const resultado=await emissor.emitir({protocolo:'LEGADO-TESTE',comprovante:'conferido'});
 assert.match(resultado.chave,/^[a-f0-9]{64}$/);
 assert.equal(consultas.some(c=>c.sql.includes('FROM mandato_testes.pedidos_recuperacao')),true);
 assert.equal(consultas.some(c=>c.sql.includes('INSERT INTO mandato_testes.auditoria_chaves_legadas')),true);
 assert.equal(consultas.at(-1).sql,'COMMIT');
 assert.equal(liberacoes,2);
});
test('emissor assistido sem aprovacao nao inicia transacao',async()=>{
 const consultas=[];
 const pool={connect:async()=>({query:async(sql)=>{
  consultas.push(sql);
  return {rows:[]};
 },release:()=>{}})};
 const emissor=criarEmissorAssistidoPostgres({
  pool,validarComprovante:async()=>true,
  buscarVinculo:async()=>({protocolo:'LEGADO-TESTE',solicitacaoId:900004}),
  auditarTentativa:async()=>{}
 });
 await assert.rejects(()=>emissor.emitir({protocolo:'LEGADO-TESTE',comprovante:'conferido'}),/Identidade não confirmada/);
 assert.equal(consultas.some(sql=>sql==='BEGIN'),false);
});
