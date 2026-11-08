import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const sql=readFileSync(new URL('./PROPOSTA-RPC-EMISSAO-RESTRITA.sql',import.meta.url),'utf8');
test('RPC de emissão permanece somente proposta sem grant à API',()=>{
 assert.match(sql,/SECURITY DEFINER/i);
 assert.match(sql,/REVOKE ALL ON FUNCTION[\s\S]*FROM PUBLIC, mandato_api_homologacao/i);
 assert.match(sql,/ROLLBACK\s*;/i);
 assert.doesNotMatch(sql,/\bGRANT\s+EXECUTE\b/i);
});
test('emissão restrita registra auditoria no mesmo bloco transacional',()=>{
 assert.match(sql,/INSERT INTO mandato_testes\.chaves_legadas/i);
 assert.match(sql,/INSERT INTO mandato_testes\.acessos_protocolo/i);
 assert.match(sql,/INSERT INTO mandato_testes\.auditoria_chaves_legadas/i);
});

test('RPC proposta bloqueia toda emissão até existir vínculo confiável',()=>{
 assert.match(sql,/BEGIN\s*-- Trava de segurança:[\s\S]*?RAISE EXCEPTION 'Emissão desabilitada: vínculo protocolo-ID não verificado'/);
});
