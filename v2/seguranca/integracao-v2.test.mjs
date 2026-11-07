import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
test('a V2 mantém integração segura desativada até migração',()=>{
 assert.match(html,/const SEGURANCA_V2_ATIVA=false;/);
 assert.match(html,/const API_SEGURANCA_V2='';/);
});
test('tela V2 contém chave e recuperação pelo WhatsApp',()=>{
 for(const id of ['segurancaV2','chaveConsultaV2','abrirRecuperacaoV2','whatsappRecuperacaoV2','enviarRecuperacaoV2'])
  assert.match(html,new RegExp('id="'+id+'"'));
});
test('modo seguro consulta a API protegida e limpa a chave',()=>{
 assert.match(html,/consultaSeguraV2\.consultar\(\{protocolo:p,chave\}\)/);
 assert.match(html,/document\.getElementById\('chaveConsultaV2'\)\.value=''/);
 assert.match(html,/consultaSeguraV2\.pedirRecuperacao/);
});
test('consulta antiga permanece apenas no modo de compatibilidade não ativado',()=>{
 assert.match(html,/if\(SEGURANCA_V2_ATIVA\)\{/);
 assert.match(html,/consulta_publica_protocolo/);
 assert.match(html,/if\(!itens\.length\)throw Error/);
});
