BEGIN;
CREATE TABLE IF NOT EXISTS auth_admin_hml.conteudos (
 id bigint GENERATED ALWAYS AS IDENTITY (START WITH 900000) PRIMARY KEY,
 tipo text NOT NULL CHECK(tipo IN ('projeto','sugestivo','pedido','emenda','resultado','acao','noticia','agenda')),
 titulo text NOT NULL,dados jsonb NOT NULL,publicado boolean NOT NULL DEFAULT false,
 versao integer NOT NULL DEFAULT 1,operacao_id uuid UNIQUE NOT NULL,
 usuario_id text NOT NULL,atualizado_em timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS auth_admin_hml.conteudos_revisoes (
 conteudo_id bigint NOT NULL REFERENCES auth_admin_hml.conteudos(id),versao integer NOT NULL,
 dados jsonb NOT NULL,usuario_id text NOT NULL,criado_em timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(conteudo_id,versao)
);
REVOKE ALL ON auth_admin_hml.conteudos,auth_admin_hml.conteudos_revisoes FROM PUBLIC;
GRANT SELECT,INSERT,UPDATE ON auth_admin_hml.conteudos TO mandato_auth_hml;
GRANT SELECT,INSERT ON auth_admin_hml.conteudos_revisoes TO mandato_auth_hml;
GRANT USAGE,SELECT ON SEQUENCE auth_admin_hml.conteudos_id_seq TO mandato_auth_hml;
COMMIT;
