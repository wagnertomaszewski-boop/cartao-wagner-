import test from 'node:test';
import assert from 'node:assert/strict';
import { criarHandlerConsulta } from './handler-consulta.mjs';
import { criarChave, verificadorHmac } from './segredos-privados.mjs';
const segredo='segredo-sintetico-para-testes-http-com-mais-de-32-bytes';
const chave=criarChave();
const pool={query:async sql=>{
 if(sql.includes('registrar_tentativa_consulta')) return {rows:[{permitido:true}]};
 if(sql.includes('chaves_acompanhamento')) return {rows:[{solicitacao_id:123,segredo_verificador:verificadorHmac('key',chave,segredo),revogada_em:null}]};
 if(sql.includes('solicitacoes_status_historico')) return {rows:[{status:'Recebida',criado_em:'2026-11-15T10:00:00Z'}]};
 if(sql.includes('FROM public.solicitacoes s WHERE')) return {rows:[{status:'Em andamento',assunto:'Iluminacao',criado_em:'2026-11-15T10:00:00Z',atualizado_em:null,nome:'NÃO RETORNAR',whatsapp:'NÃO RETORNAR'}]};
 throw new Error('SQL inesperado');
}};
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
 assert.deepEqual(r.corpo,{autorizado:true,solicitacao:{status:'Em andamento',assunto:'Iluminacao',criadoEm:'2026-11-15T10:00:00Z',atualizadoEm:null,historico:[{status:'Recebida',criadoEm:'2026-11-15T10:00:00Z'}]}});
 assert.equal(JSON.stringify(r.corpo).includes('NÃO RETORNAR'),false);
});
test('sem origem validada bloqueia mesmo com chave',async()=>{
 const r=await tratar({metodo:'POST',corpo:{protocolo:'2026-TESTE',chave}});
 assert.equal(r.status,403);
});

test('falha do limitador PostgreSQL bloqueia acesso sem dados pessoais',async()=>{
 const poolFalho={query:async()=>{throw Error('banco fora');}};
 const handler=criarHandlerConsulta({pool:poolFalho,segredoServidor:segredo,obterOrigemConfiavel:()=> 'ip-confiavel'});
 const resposta=await handler({metodo:'POST',corpo:{protocolo:'2026-TESTE',chave}});
 assert.equal(resposta.status,403);
 assert.equal(JSON.stringify(resposta).includes('banco fora'),false);
});
test('falha na identificação da origem não autoriza consulta',async()=>{
 const handler=criarHandlerConsulta({pool,segredoServidor:segredo,obterOrigemConfiavel:()=>{throw Error('proxy inválido');}});
 const resposta=await handler({metodo:'POST',corpo:{protocolo:'2026-TESTE',chave}});
 assert.equal(resposta.status,403);
});
