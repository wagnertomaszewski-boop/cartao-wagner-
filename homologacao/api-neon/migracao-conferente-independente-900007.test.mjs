import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const sql=readFileSync(new URL('./migracao-conferente-independente-900007.sql',import.meta.url),'utf8');
test('migração de homologação exige conferente externo sem liberar identidade por navegador',()=>{
 assert.match(sql,/CREATE OR REPLACE FUNCTION mandato_testes\.registrar_decisao_sintetica_900007/);
 assert.match(sql,/conferente='REV-CONFERENTE-EXTERNO'/);
 assert.match(sql,/conferente IS DISTINCT FROM 'REV-'\|\|substring\(p_operador from 4\)/);
 assert.match(sql,/confirmada IS TRUE AND consumida_em IS NULL/);
 assert.match(sql,/UPDATE mandato_testes\.evidencias_identidade_sinteticas_900007/);
 assert.match(sql,/INSERT INTO mandato_testes\.decisoes_identidade_homologacao/);
 assert.match(sql,/p_protocolo IS DISTINCT FROM 'LEGADO-EMISSAO-TESTE-900007'/);
 assert.doesNotMatch(sql,/\bGRANT\b|\bTRUNCATE\b|\bDELETE FROM\b/i);
});
