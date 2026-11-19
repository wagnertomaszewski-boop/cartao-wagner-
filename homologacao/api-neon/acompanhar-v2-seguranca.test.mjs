import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const pagina=readFileSync(new URL('../../v2/acompanhar.html',import.meta.url),'utf8');
test('consulta V2 exige chave e fica restrita à origem de homologação',()=>{
 assert.match(pagina,/if\(!p\|\|!chave\)/);
 assert.match(pagina,/location\.pathname\.startsWith\('\/hml\/'\)/);
 assert.match(pagina,/cliente-recuperacao-manual\.mjs/);
});
test('novo caminho exige chave e não chama RPCs legadas',()=>{
 const inicio=pagina.indexOf('async function consultarSeguramenteV2(');
 const fim=pagina.indexOf('async function consultar()',inicio);
 assert.ok(inicio>=0&&fim>inicio);
 const novo=pagina.slice(inicio,fim);
 assert.match(novo,/\.consultar\(\{protocolo,chave\}\)/);
 assert.doesNotMatch(novo,/consulta_publica_|consultar_protocolo/);
 assert.match(novo,/campo\.value='';/);
});
test('resposta protegida usa texto simples e não exibe dados pessoais',()=>{
 assert.match(pagina,/rSolicitante'\)\.textContent='Protegido'/);
 assert.match(pagina,/rLocalidade'\)\.textContent='Protegida'/);
 assert.match(pagina,/linha\.textContent=String\(item\.mensagem\|\|item\.texto\|\|''\)/);
 assert.match(pagina,/renderTimeline\(s\.status\|\|'Recebida',historicoSeguro\)/);
});
test('a página inteira dispensa as RPCs de consulta por protocolo',()=>{
 assert.doesNotMatch(pagina,/consulta_publica_|consultar_protocolo|SUPABASE_KEY/);
});
