-- ADITIVA CANDIDATA; SOMENTE EM LABORATÓRIO APÓS APROVAÇÃO.
-- Não altera public.solicitacoes.whatsapp, Storage nem a recuperação já homologada.
BEGIN;
DO $$ BEGIN
 IF current_setting('mandato.migracao_autorizada',true) IS DISTINCT FROM 'sim' THEN
   RAISE EXCEPTION 'Migração de contatos não autorizada';
 END IF;
 IF to_regclass('mandato_privado.pedidos_recuperacao') IS NULL OR
    NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='mandato_api_privada' AND NOT rolbypassrls AND NOT rolsuper)
 THEN RAISE EXCEPTION 'Pré-requisitos privados ausentes'; END IF;
END $$;
CREATE TABLE IF NOT EXISTS mandato_privado.contatos_regularizados (
 pedido_id uuid PRIMARY KEY REFERENCES mandato_privado.pedidos_recuperacao(id) ON DELETE RESTRICT,
 telefone_e164 text NOT NULL CHECK (telefone_e164 ~ '^[+]55[1-9][0-9]{10}),
 telefone_verificador bytea NOT NULL CHECK (octet_length(telefone_verificador)=32),
 justificativa text NOT NULL CHECK (char_length(justificativa) BETWEEN 20 AND 1000),
 operador_id uuid NOT NULL,
 criado_em timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON mandato_privado.contatos_regularizados FROM PUBLIC,anon,authenticated;
ALTER TABLE mandato_privado.contatos_regularizados ENABLE ROW LEVEL SECURITY;
ALTER TABLE mandato_privado.contatos_regularizados FORCE ROW LEVEL SECURITY;
DO $$ BEGIN
 IF NOT EXISTS (
  SELECT 1 FROM pg_policies WHERE schemaname='mandato_privado'
  AND tablename='contatos_regularizados' AND policyname='backend_restrito'
 ) THEN
  CREATE POLICY backend_restrito ON mandato_privado.contatos_regularizados
  TO mandato_api_privada USING(true) WITH CHECK(true);
 ELSIF NOT EXISTS (
  SELECT 1 FROM pg_policies WHERE schemaname='mandato_privado'
  AND tablename='contatos_regularizados' AND policyname='backend_restrito'
  AND permissive='PERMISSIVE' AND cmd='ALL'
  AND roles=ARRAY['mandato_api_privada']::name[] AND qual='true' AND with_check='true'
 ) THEN
  RAISE EXCEPTION 'Política preexistente incompatível para contatos_regularizados';
 END IF;
END $$;
GRANT SELECT,INSERT ON mandato_privado.contatos_regularizados TO mandato_api_privada;
COMMIT;
),
 telefone_verificador bytea NOT NULL CHECK (octet_length(telefone_verificador)=32),
 justificativa text NOT NULL CHECK (char_length(justificativa) BETWEEN 20 AND 1000),
 operador_id uuid NOT NULL,
 criado_em timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON mandato_privado.contatos_regularizados FROM PUBLIC,anon,authenticated;
ALTER TABLE mandato_privado.contatos_regularizados ENABLE ROW LEVEL SECURITY;
ALTER TABLE mandato_privado.contatos_regularizados FORCE ROW LEVEL SECURITY;
DO $$ BEGIN
 IF NOT EXISTS (
  SELECT 1 FROM pg_policies WHERE schemaname='mandato_privado'
  AND tablename='contatos_regularizados' AND policyname='backend_restrito'
 ) THEN
  CREATE POLICY backend_restrito ON mandato_privado.contatos_regularizados
  TO mandato_api_privada USING(true) WITH CHECK(true);
 ELSIF NOT EXISTS (
  SELECT 1 FROM pg_policies WHERE schemaname='mandato_privado'
  AND tablename='contatos_regularizados' AND policyname='backend_restrito'
  AND permissive='PERMISSIVE' AND cmd='ALL'
  AND roles=ARRAY['mandato_api_privada']::name[] AND qual='true' AND with_check='true'
 ) THEN
  RAISE EXCEPTION 'Política preexistente incompatível para contatos_regularizados';
 END IF;
END $$;
GRANT SELECT,INSERT ON mandato_privado.contatos_regularizados TO mandato_api_privada;
COMMIT;
