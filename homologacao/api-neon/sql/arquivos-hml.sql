BEGIN;
CREATE TABLE IF NOT EXISTS auth_admin_hml.arquivos (
 id uuid PRIMARY KEY,solicitacao_id uuid NOT NULL REFERENCES auth_admin_hml.pedidos(id),
 nome text NOT NULL,mime text NOT NULL,conteudo bytea NOT NULL,sha256 text NOT NULL,
 escopo text NOT NULL CHECK(escopo IN ('cidadao','interno')),registro_id text NOT NULL DEFAULT '',
 criado_em timestamptz NOT NULL DEFAULT now(),usuario_id text,
 UNIQUE(solicitacao_id,sha256,escopo,registro_id)
);
REVOKE ALL ON auth_admin_hml.arquivos FROM PUBLIC;
GRANT SELECT,INSERT ON auth_admin_hml.arquivos TO mandato_auth_hml;
COMMIT;
