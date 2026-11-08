import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const html=readFileSync(new URL('../../v2/index.html',import.meta.url),'utf8');

test('a interface pública mantém nova consulta segura desligada até migração aprovada',()=>{
 assert.match(html,/const SEGURANCA_V2_ATIVA=false;/);
 assert.match(html,/const API_SEGURANCA_V2='';/);
});
test('o caminho legado de consulta continua identificável para migração sem interrupção',()=>{
 assert.match(html,/rest\/v1\/rpc\/consulta_publica_protocolo/);
 assert.match(html,/if\(SEGURANCA_V2_ATIVA\)/);
});
test('consulta nova exige chave e apaga seu valor depois da tentativa',()=>{
 assert.match(html,/consultaSeguraV2\.consultar\(\{protocolo:p,chave\}\)/);
 assert.match(html,/getElementById\('chaveConsultaV2'\)\.value='';/);
});
test('resposta segura preenche dados via textContent e mantém dados pessoais protegidos',()=>{
 assert.match(html,/getElementById\('rSolicitante'\)\.textContent='Protegido'/);
 assert.match(html,/getElementById\('rLocalidade'\)\.textContent='Protegida'/);
 assert.match(html,/linha\.textContent=String\(item\.texto\|\|''\)/);
});
