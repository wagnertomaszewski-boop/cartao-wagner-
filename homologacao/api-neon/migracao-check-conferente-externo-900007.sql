-- MIGRAÇÃO PROPOSTA, NÃO EXECUTADA. Neon isolado proud-firefly-64745516.
-- A função 900007 exige REV-CONFERENTE-EXTERNO, mas CHECK antigo só aceita REV-TESTE-900007.
-- Mantém temporariamente ambos os conferentes para preservar evidência consumida anterior.
-- A RPC só consome evidência confirmada do conferente externo.
ALTER TABLE mandato_testes.evidencias_identidade_sinteticas_900007
 DROP CONSTRAINT evidencias_identidade_sinteticas_900007_conferente_check,
 ADD CONSTRAINT evidencias_identidade_sinteticas_900007_conferente_check
 CHECK (conferente IN ('REV-TESTE-900007','REV-CONFERENTE-EXTERNO'));
-- Rollback: requer revisar dados com conferente externo antes de restaurar CHECK antigo.
