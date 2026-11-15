import test from 'node:test';
import assert from 'node:assert/strict';
import { criarHandlerConsulta } from './handler-consulta.mjs';
import { criarChave, verificadorHmac } from './segredos-privados.mjs';
const segredo='segredo-sintetico-para-testes-http-com-mais-de-32-bytes';
const chave=criarChave();
const pool={query:async sql=>sql.includes('registrar_tentativa_consulta')
 ? {rows:[{permitido:true}]} : {rows:[{solicitacao_id:123,segredo_verificador:verificadorHmac('key',chave,segredo),revogada_em:null}]}};
const tratar=criarHandlerConsulta({pool,segredoServidor:segredo,obterOrigemConfiavel:c=>c?.origemVerificada??null});
test('não permite GET e impede cache',async()=>{
 const r=await tratar({metodo:'GET'});
 assert.equal(r.status,405);
 assert.equal(r.cabecalhos['cache-control'],'no-store');
});
test('nega consulta apenas com protocolo',async()=>{
 const r=await tratar({metodo:'POST',corpo:{protocolo:'2026-TESTE'},contexto:{origemVerificada:'ip-confiavel'}});
 assert.equal(r.status,403);
 assert.deepEqual(r.corpo,{autorizado:false});
});
test('permite protocolo e chave sem devolver dados pessoais',async()=>{
 const r=await tratar({metodo:'POST',corpo:{protocolo:'2026-TESTE',chave},contexto:{origemVerificada:'ip-confiavel'}});
 assert.equal(r.status,200);
 assert.deepEqual(r.corpo,{autorizado:true});
});
test('sem origem validada bloqueia mesmo com chave',async()=>{
 const r=await tratar({metodo:'POST',corpo:{protocolo:'2026-TESTE',chave}});
 assert.equal(r.status,403);
});
