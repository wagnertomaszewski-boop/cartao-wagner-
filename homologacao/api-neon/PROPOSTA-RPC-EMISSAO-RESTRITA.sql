-- PROPOSTA NÃO EXECUTADA. Homologação Neon isolada.
-- Não conceder EXECUTE à conta da API até haver identidade confirmada
-- independentemente e política de autorização por protocolo.
-- SECURITY DEFINER sem validação de identidade seria vulnerabilidade grave.
BEGIN;
CREATE OR REPLACE FUNCTION mandato_testes.emitir_chave_legada_interna(
 p_protocolo text,p_solicitacao_id bigint,p_hash text
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, mandato_testes
AS $$
BEGIN
 IF p_protocolo IS NULL OR length(trim(p_protocolo)) NOT BETWEEN 1 AND 40
    OR p_hash IS NULL OR p_hash !~ '^[a-f0-9]{64}$'
    OR p_solicitacao_id IS NULL OR p_solicitacao_id<=0
 THEN RAISE EXCEPTION 'Dados inválidos'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_protocolo,0));
 -- A existência do ID não prova vínculo com o protocolo.
 -- Antes de qualquer GRANT, exigir vínculo comprovado por fonte legada confiável.
 IF NOT EXISTS (SELECT 1 FROM mandato_testes.solicitacoes WHERE id=p_solicitacao_id)
 THEN RAISE EXCEPTION 'Solicitação não encontrada'; END IF;
 IF EXISTS (SELECT 1 FROM mandato_testes.chaves_legadas WHERE protocolo=p_protocolo)
    OR EXISTS (SELECT 1 FROM mandato_testes.acessos_protocolo WHERE protocolo=p_protocolo)
 THEN RAISE EXCEPTION 'Acesso já emitido'; END IF;
 INSERT INTO mandato_testes.chaves_legadas(protocolo,hash_chave)
 VALUES(p_protocolo,p_hash);
 INSERT INTO mandato_testes.acessos_protocolo(solicitacao_id,protocolo,segredo_hash)
 VALUES(p_solicitacao_id,p_protocolo,p_hash);
 INSERT INTO mandato_testes.auditoria_chaves_legadas(protocolo,solicitacao_id,evento)
 VALUES(p_protocolo,p_solicitacao_id,'chave_legada_emitida');
END; $$;
REVOKE ALL ON FUNCTION mandato_testes.emitir_chave_legada_interna(text,bigint,text)
 FROM PUBLIC, mandato_api_homologacao;
-- SEM GRANT: função inacessível à API. Autorização futura exige
-- identidade verificada no servidor e vínculo confiável id/protocolo.
ROLLBACK;
