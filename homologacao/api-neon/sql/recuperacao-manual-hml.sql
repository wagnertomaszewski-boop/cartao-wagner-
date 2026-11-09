-- Aditiva; exclusivamente auth_admin_hml na branch Neon de homologação.
BEGIN;
ALTER TABLE auth_admin_hml.pedidos ADD COLUMN IF NOT EXISTS telefone_cadastrado text;
CREATE TABLE IF NOT EXISTS auth_admin_hml.recuperacoes_manuais (
 id uuid PRIMARY KEY,
 solicitacao_id uuid NOT NULL REFERENCES auth_admin_hml.pedidos(id),
 recibo_hash text NOT NULL,
 situacao text NOT NULL DEFAULT 'pendente' CHECK(situacao IN ('pendente','aprovado','rejeitado','concluido','bloqueado')),
 justificativa text,
 decidido_por text,
 decidido_em timestamptz,
 desafio_id uuid,
 codigo_hash text,
 expira_em timestamptz,
 emitido_em timestamptz,
 emissoes integer NOT NULL DEFAULT 0 CHECK(emissoes BETWEEN 0 AND 3),
 tentativas integer NOT NULL DEFAULT 0 CHECK(tentativas BETWEEN 0 AND 5),
 consumido_em timestamptz,
 criado_em timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS recuperacoes_manuais_solicitacao_idx ON auth_admin_hml.recuperacoes_manuais(solicitacao_id,criado_em);
REVOKE ALL ON auth_admin_hml.recuperacoes_manuais FROM PUBLIC;
GRANT SELECT,INSERT,UPDATE ON auth_admin_hml.recuperacoes_manuais TO mandato_auth_hml;
COMMIT;
