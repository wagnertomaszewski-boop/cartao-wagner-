-- PLANO DE MIGRACAO (NAO EXECUTAR).
-- Somente para futura instalação expressamente autorizada em ambiente isolado.
-- NUNCA executar no Supabase ou no Neon padrão de produção sem nova autorização.
-- A chave privada Ed25519 e a emissão da prova pertencem a um conferente externo,
-- separado do backend de atendimento e do operador de aprovação.
BEGIN;
DO $$ BEGIN
 IF current_setting('mandato.migracao_autorizada',true) IS DISTINCT FROM 'sim'
 THEN RAISE EXCEPTION 'Migração não autorizada'; END IF;
 IF to_regclass('mandato_privado.pedidos_recuperacao') IS NULL
 THEN RAISE EXCEPTION 'Estrutura privada ausente'; END IF;
END $$;
CREATE TABLE IF NOT EXISTS mandato_privado.atestados_regularizacao (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 pedido_id uuid NOT NULL REFERENCES mandato_privado.pedidos_recuperacao(id) ON DELETE RESTRICT,
 solicitacao_id bigint NOT NULL REFERENCES public.solicitacoes(id) ON DELETE RESTRICT,
 payload text NOT NULL CHECK (length(payload) BETWEEN 100 AND 2048),
 assinatura text NOT NULL CHECK (length(assinatura) BETWEEN 80 AND 128),
 recebido_em timestamptz NOT NULL DEFAULT now(),
 revogado_em timestamptz
);
CREATE INDEX IF NOT EXISTS atestados_regularizacao_pedido_idx
 ON mandato_privado.atestados_regularizacao(pedido_id,solicitacao_id,recebido_em DESC)
 WHERE revogado_em IS NULL;
-- Sem permissão de escrita para API pública ou papel da API privada.
REVOKE ALL ON mandato_privado.atestados_regularizacao FROM PUBLIC,anon,authenticated,mandato_api_privada;
ALTER TABLE mandato_privado.atestados_regularizacao ENABLE ROW LEVEL SECURITY;
ALTER TABLE mandato_privado.atestados_regularizacao FORCE ROW LEVEL SECURITY;
CREATE POLICY api_ler_atestados ON mandato_privado.atestados_regularizacao
 FOR SELECT TO mandato_api_privada USING (revogado_em IS NULL);
GRANT SELECT ON mandato_privado.atestados_regularizacao TO mandato_api_privada;
-- Uma role SEPARADA e um procedimento de entrega de atestados devem ser auditados
-- antes de conceder qualquer INSERT (não há GRANT de INSERT neste arquivo).
COMMIT;
