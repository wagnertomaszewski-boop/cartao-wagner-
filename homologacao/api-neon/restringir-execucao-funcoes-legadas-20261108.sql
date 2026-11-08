-- SOMENTE NEON ISOLADO proud-firefly-64745516. NÃO EXECUTADO.
-- Revoga EXECUTE da conta HTTP apenas nas quatro funções legadas.
-- Antes: confirmar projeto, role, ACL e sucesso do CI; depois: reexecutar gate.
BEGIN;
REVOKE EXECUTE ON FUNCTION mandato_testes.aprovacao_emissao_teste_900006(bigint) FROM mandato_api_homologacao;
REVOKE EXECUTE ON FUNCTION mandato_testes.emitir_chave_legada_teste_900004(text,bigint,text) FROM mandato_api_homologacao;
REVOKE EXECUTE ON FUNCTION mandato_testes.emitir_chave_legada_teste_900005(text,bigint,text) FROM mandato_api_homologacao;
REVOKE EXECUTE ON FUNCTION mandato_testes.emitir_chave_legada_teste_900006(text,bigint,text) FROM mandato_api_homologacao;
COMMIT;
-- Reversão, somente se necessária:
-- GRANT EXECUTE ON FUNCTION mandato_testes.aprovacao_emissao_teste_900006(bigint) TO mandato_api_homologacao;
-- GRANT EXECUTE ON FUNCTION mandato_testes.emitir_chave_legada_teste_900004(text,bigint,text) TO mandato_api_homologacao;
-- GRANT EXECUTE ON FUNCTION mandato_testes.emitir_chave_legada_teste_900005(text,bigint,text) TO mandato_api_homologacao;
-- GRANT EXECUTE ON FUNCTION mandato_testes.emitir_chave_legada_teste_900006(text,bigint,text) TO mandato_api_homologacao;
