-- ESQUEMA EXPERIMENTAL. NÃO EXECUTAR EM SUPABASE, NEON OU PRODUÇÃO.
-- Os testes criam isto apenas em PostgreSQL WASM descartável (PGlite).
-- O banco do VERIFICADOR precisa ser separado do banco do mandato.
-- Dados de telefone em schema privado, com acesso mínimo e retenção curta.
CREATE SCHEMA IF NOT EXISTS verificador_posse_hml;

CREATE TABLE IF NOT EXISTS verificador_posse_hml.desafios (
 desafio_id uuid PRIMARY KEY,
 pedido_id uuid NOT NULL UNIQUE,
 solicitacao_id bigint NOT NULL CHECK (solicitacao_id>0),
 operador_id uuid NOT NULL,
 telefone_original text NOT NULL CHECK (telefone_original ~ '^[+]55[1-9][0-9]{9,10}$'),
 telefone_novo text NOT NULL CHECK (telefone_novo ~ '^[+]55[1-9][0-9]{10}$'),
 telefone_hash bytea NOT NULL CHECK (octet_length(telefone_hash)=32),
 codigo_verificador bytea NOT NULL CHECK (octet_length(codigo_verificador)=32),
 evidencia_id uuid NOT NULL UNIQUE,
 criado_em timestamptz NOT NULL,
 expira_em timestamptz NOT NULL,
 tentativas integer NOT NULL DEFAULT 0 CHECK(tentativas BETWEEN 0 AND 5),
 confirmado_em timestamptz,
 revogado_em timestamptz,
 CHECK(expira_em>criado_em AND expira_em<=criado_em+interval '5 minutes'),
 CHECK(confirmado_em IS NULL OR (confirmado_em>=criado_em AND confirmado_em<expira_em)),
 CHECK(NOT (confirmado_em IS NOT NULL AND revogado_em IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS desafios_telefone_hora_idx
 ON verificador_posse_hml.desafios(telefone_hash,criado_em DESC);
CREATE INDEX IF NOT EXISTS desafios_pendentes_idx
 ON verificador_posse_hml.desafios(expira_em)
 WHERE confirmado_em IS NULL AND revogado_em IS NULL;

REVOKE ALL ON SCHEMA verificador_posse_hml FROM PUBLIC;
REVOKE ALL ON TABLE verificador_posse_hml.desafios FROM PUBLIC;
-- Nenhum GRANT a anon, authenticated, mandato_api_privada ou service_role.
-- Criar role de serviço separada, auditoria, retenção e grants limitados somente
-- após autorização e revisão de segurança.
