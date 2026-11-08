-- Aplicar EXCLUSIVAMENTE na branch isolada de homologação Neon.
-- Não modifica a estrutura de solicitações dos cidadãos nem o Supabase.
-- O histórico é um livro de eventos: correções devem ser novos registros.
BEGIN;
CREATE OR REPLACE FUNCTION fiscalizacao_homologacao.impedir_alteracao_historico()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Histórico de fiscalização é somente acréscimo; registre um novo evento para corrigir informações'
    USING ERRCODE = '42501';
END;
$$;
DROP TRIGGER IF EXISTS historico_fiscalizacao_append_only ON fiscalizacao_homologacao.solicitacoes_fiscalizacao_historico;
CREATE TRIGGER historico_fiscalizacao_append_only
BEFORE UPDATE OR DELETE ON fiscalizacao_homologacao.solicitacoes_fiscalizacao_historico
FOR EACH ROW EXECUTE FUNCTION fiscalizacao_homologacao.impedir_alteracao_historico();
COMMIT;
