import {test} from 'node:test';
import assert from 'node:assert/strict';
import {emitirChavePrivada} from './chaves-privadas.mjs';
import {criarConsultaComChave,SQL_CONSULTAR_CHAVE} from './consulta-chave-privada.mjs';

test('consulta parametrizada envia hash e não segredo em SQL',async()=>{
 const {chave,hash}=emitirChavePrivada();
 const chamadas=[];
 const consultar=criarConsultaComChave({executar:async(sql,params)=>{
  chamadas.push({sql,params});
  return {rows:[{assunto:'Iluminação',status:'Em andamento',nome:'PRIVADO',whatsapp:'PRIVADO'}]};
 }});
 assert.deepEqual(await consultar({protocolo:'2026-000001',chave}),[{assunto:'Iluminação',status:'Em andamento'}]);
 assert.equal(chamadas[0].sql,SQL_CONSULTAR_CHAVE);
 assert.equal(chamadas[0].params[0],'2026-000001');
 assert.deepEqual(chamadas[0].params[1],hash);
 assert.equal(chamadas[0].sql.includes(chave),false);
 assert.match(SQL_CONSULTAR_CHAVE,/c\.revogada_em IS NULL/);
});
test('chave inválida e protocolo adulterado não consultam banco',async()=>{
 let chamadas=0;
 const consultar=criarConsultaComChave({executar:async()=>{chamadas++;return {rows:[]};}});
 for(const dados of [
  {protocolo:'2026-000001',chave:'invalida'},
  {protocolo:'2026-000001 OR true',chave:emitirChavePrivada().chave},
  {protocolo:'',chave:emitirChavePrivada().chave}
 ])await assert.rejects(consultar(dados),/inválidos/);
 assert.equal(chamadas,0);
});
test('sem registro correspondente retorna vazio sem dados pessoais',async()=>{
 const consultar=criarConsultaComChave({executar:async()=>({rows:[]})});
 assert.deepEqual(await consultar({protocolo:'2026-000001',chave:emitirChavePrivada().chave}),[]);
});
test('resultado inesperado falha fechado',async()=>{
 const consultar=criarConsultaComChave({executar:async()=>({rows:[{},{}]})});
 await assert.rejects(consultar({protocolo:'2026-000001',chave:emitirChavePrivada().chave}),/inválida/);
});
