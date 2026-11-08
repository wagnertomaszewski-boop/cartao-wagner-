import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname,resolve} from 'node:path';

const pasta=dirname(fileURLToPath(import.meta.url));
const inicial=readFileSync(resolve(pasta,'estrutura-isolada.sql'),'utf8');
const migracao=readFileSync(resolve(pasta,'002_historico_append_only.sql'),'utf8');

test('histórico relaciona evento à solicitação e mantém data de registro no servidor',()=>{
 assert.match(inicial,/solicitacao_id\s+bigint\s+NOT NULL\s+REFERENCES\s+fiscalizacao_homologacao\.solicitacoes\(id\)\s+ON DELETE RESTRICT/i);
 assert.match(inicial,/registrado_em\s+timestamptz\s+NOT NULL\s+DEFAULT\s+now\(\)/i);
 assert.match(inicial,/tipo\s+text\s+NOT NULL\s+CHECK\s*\(tipo IN\s*\('encaminhamento','cobranca','retorno','verificacao'\)\)/i);
});

test('histórico é protegido contra alteração e exclusão, mas permite novos eventos',()=>{
 assert.match(migracao,/BEFORE UPDATE OR DELETE ON fiscalizacao_homologacao\.solicitacoes_fiscalizacao_historico/i);
 assert.match(migracao,/FOR EACH ROW EXECUTE FUNCTION fiscalizacao_homologacao\.impedir_alteracao_historico\(\)/i);
 assert.match(migracao,/RAISE EXCEPTION/i);
 assert.doesNotMatch(migracao,/BEFORE INSERT|TRUNCATE\s+TABLE|DELETE\s+FROM\s+fiscalizacao_homologacao/i);
});

test('migração limita alterações ao esquema isolado e preserva segurança pública',()=>{
 assert.match(inicial,/REVOKE ALL ON SCHEMA fiscalizacao_homologacao FROM PUBLIC/i);
 assert.match(inicial,/REVOKE ALL ON ALL TABLES IN SCHEMA fiscalizacao_homologacao FROM PUBLIC/i);
 assert.doesNotMatch(migracao,/\b(?:public|auth|storage|mandato_testes)\s*\./i);
 assert.doesNotMatch(migracao,/\bGRANT\b|\bALTER ROLE\b|\bCREATE ROLE\b/i);
 assert.match(migracao,/^BEGIN;/m);
 assert.match(migracao,/^COMMIT;/m);
});
