import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const pagina=readFileSync(new URL('../../v2/acompanhar.html',import.meta.url),'utf8');
test('pagina V2 de acompanhamento mantém nova consulta desligada',()=>{
 assert.match(pagina,/const CONSULTA_SEGURA_ACOMPANHAR_V2_ATIVA=false;/);
 assert.match(pagina,/const API_CONSULTA_SEGURA_ACOMPANHAR_V2='';/);
});
test('novo caminho exige chave e não chama RPCs legadas',()=>{
 const inicio=pagina.indexOf('async function consultarSeguramenteV2(');
 const fim=pagina.indexOf('async function consultar()',inicio);
 assert.ok(inicio>=0&&fim>inicio);
 const novo=pagina.slice(inicio,fim);
 assert.match(novo,/api\.consultar\(\{protocolo,chave\}\)/);
 assert.doesNotMatch(novo,/consulta_publica_|consultar_protocolo/);
 assert.match(novo,/campo\.value='';/);
});
test('resposta protegida usa texto simples e não exibe dados pessoais',()=>{
 assert.match(pagina,/rSolicitante'\)\.textContent='Protegido'/);
 assert.match(pagina,/rLocalidade'\)\.textContent='Protegida'/);
 assert.match(pagina,/linha\.textContent=String\(item\.texto\|\|''\)/);
 assert.match(pagina,/renderTimeline\(s\.status\|\|'Recebida',historicoSeguro\)/);
});
test('consulta antiga fica no ramo de compatibilidade enquanto flag desligada',()=>{
 assert.match(pagina,/if\(CONSULTA_SEGURA_ACOMPANHAR_V2_ATIVA\)\{await consultarSeguramenteV2\(p\);return;\}/);
 assert.match(pagina,/rpc\/consulta_publica_protocolo/);
});
