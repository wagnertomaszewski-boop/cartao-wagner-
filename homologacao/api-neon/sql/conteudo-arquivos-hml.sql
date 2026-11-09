BEGIN;
CREATE TABLE IF NOT EXISTS auth_admin_hml.conteudo_arquivos (
 id uuid PRIMARY KEY,conteudo_id bigint NOT NULL REFERENCES auth_admin_hml.conteudos(id),
 uso text NOT NULL CHECK(uso IN ('capa','antes','depois','documento')),
 nome text NOT NULL,mime text NOT NULL,conteudo bytea NOT NULL,sha256 text NOT NULL,
 usuario_id text NOT NULL,criado_em timestamptz NOT NULL DEFAULT now(),
 UNIQUE(conteudo_id,uso,sha256)
);
REVOKE ALL ON auth_admin_hml.conteudo_arquivos FROM PUBLIC;
GRANT SELECT,INSERT ON auth_admin_hml.conteudo_arquivos TO mandato_auth_hml;
COMMIT;
