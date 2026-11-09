BEGIN;
CREATE TABLE IF NOT EXISTS auth_admin_hml.importacoes_legadas (
 origem text NOT NULL,id_origem text NOT NULL,fonte_hash text NOT NULL,
 solicitacao_id uuid REFERENCES auth_admin_hml.pedidos(id),
 PRIMARY KEY(origem,id_origem)
);
REVOKE ALL ON auth_admin_hml.importacoes_legadas FROM PUBLIC;
GRANT SELECT,INSERT,UPDATE ON auth_admin_hml.importacoes_legadas TO mandato_auth_hml;
COMMIT;
