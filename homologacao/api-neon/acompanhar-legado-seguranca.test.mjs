import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const pagina=readFileSync(new URL('../../acompanhar.html',import.meta.url),'utf8');
test('pagina de acompanhamento legada mantém consulta nova desligada',()=>{
 assert.match(pagina,/const CONSULTA_SEGURA_LEGADO_ATIVA = false;/);
 assert.match(pagina,/const API_CONSULTA_SEGURA_LEGADO = '';/);
});
test('consulta preparada exige cliente HTTPS e chave secreta, sem revelar localidade',()=>{
 assert.match(pagina,/import\('\.\/v2\/seguranca\/consulta-segura\.mjs'\)/);
 assert.match(pagina,/cliente\.consultar\(\{protocolo,chave\}\)/);
 assert.match(pagina,/rLocalidade'\)\.textContent = 'Protegida'/);
 assert.match(pagina,/chaveSeguraLegado'\)\.value = ''/);
});
test('consulta antiga só é alcançada enquanto nova integração não estiver habilitada',()=>{
 assert.match(pagina,/if \(CONSULTA_SEGURA_LEGADO_ATIVA\) \{\s*await consultarSeguramenteLegado\(protocolo\);\s*return;/);
 assert.match(pagina,/rpc\/consulta_publica_protocolo/);
});
