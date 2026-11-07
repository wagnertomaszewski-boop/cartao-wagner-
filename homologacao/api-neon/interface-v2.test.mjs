import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../../v2/index.html',import.meta.url),'utf8');
test('seguranca de consulta permanece desativada ate implantacao da API',()=>{
 assert.match(html,/const SEGURANCA_V2_ATIVA=false;/);
 assert.match(html,/const API_SEGURANCA_V2='';/);
});
test('interface nao promete entrega automatica de chave pelo WhatsApp',()=>{
 assert.match(html,/Solicitar recuperaç[aã]o de acesso/);
 assert.match(html,/Nenhuma chave é enviada automaticamente/);
 assert.doesNotMatch(html,/Recuperar chave pelo WhatsApp<\/button>/);
});
