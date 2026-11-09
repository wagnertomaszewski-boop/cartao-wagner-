-- Aditiva, apenas no schema privado da homologação; nunca executa SQL em public.
BEGIN;
ALTER TABLE auth_admin_hml.pedidos ADD COLUMN IF NOT EXISTS protocolo_publico text;
ALTER TABLE auth_admin_hml.pedidos ADD COLUMN IF NOT EXISTS dados_solicitacao jsonb;
CREATE UNIQUE INDEX IF NOT EXISTS pedidos_protocolo_publico_idx ON auth_admin_hml.pedidos(protocolo_publico);
CREATE SEQUENCE IF NOT EXISTS auth_admin_hml.protocolo_modelo_seq START 900000;
REVOKE ALL ON SEQUENCE auth_admin_hml.protocolo_modelo_seq FROM PUBLIC;
GRANT USAGE,SELECT ON SEQUENCE auth_admin_hml.protocolo_modelo_seq TO mandato_auth_hml;
COMMIT;
