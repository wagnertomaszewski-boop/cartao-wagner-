import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const sql=readFileSync(new URL('./CANDIDATA-ADITIVA-CHAVES-PRIVADAS-NAO-EXECUTAR.sql',import.meta.url),'utf8');
const codigo=sql.replace(/--[^\n]*/g,'');
test('migração só adiciona estrutura e não altera dados existentes',()=>{
 assert.match(codigo,/CREATE TABLE IF NOT EXISTS mandato_privado\.chaves_acompanhamento/i);
 assert.match(codigo,/REFERENCES public\.solicitacoes\(id\) ON DELETE RESTRICT/i);
 assert.doesNotMatch(codigo,/\b(?:DROP\s+(?:TABLE|SCHEMA|FUNCTION)|TRUNCATE\s+|DELETE\s+FROM|UPDATE\s+|INSERT\s+INTO|GRANT\s+)/i);
});
test('chave privada é armazenada como hash de 32 bytes, sem leitura pública',()=>{
 assert.match(codigo,/chave_hash bytea NOT NULL CHECK \(octet_length\(chave_hash\) = 32\)/i);
 assert.match(codigo,/REVOKE ALL ON mandato_privado\.chaves_acompanhamento FROM PUBLIC, anon, authenticated/i);
 assert.match(codigo,/FORCE ROW LEVEL SECURITY/i);
});
test('migração é transacional e não revoga funções antigas',()=>{
 assert.match(codigo,/^\s*BEGIN\s*;/i);
 assert.match(codigo,/COMMIT\s*;\s*$/i);
 assert.doesNotMatch(codigo,/\b(?:ALTER FUNCTION|DROP FUNCTION|REVOKE EXECUTE)\b/i);
});
