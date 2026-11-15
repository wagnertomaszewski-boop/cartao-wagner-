-- RASCUNHO PARA REVISÃO: NÃO EXECUTAR EM PRODUÇÃO
-- Migração aditiva compatível com public.solicitacoes(id bigint).
-- Requer revisão de credenciais, modelo de autenticação e ensaio de restauração.
BEGIN;
CREATE SCHEMA IF NOT EXISTS mandato_privado;
REVOKE ALL ON SCHEMA mandato_privado FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS mandato_privado.chaves_acompanhamento (
  solicitacao_id bigint PRIMARY KEY REFERENCES public.solicitacoes(id) ON DELETE RESTRICT,
  segredo_verificador bytea NOT NULL CHECK (octet_length(segredo_verificador) = 32),
  segredo_versao integer NOT NULL DEFAULT 1 CHECK (segredo_versao > 0),
  criada_em timestamptz NOT NULL DEFAULT now(),
  renovada_em timestamptz,
  revogada_em timestamptz
);
CREATE TABLE IF NOT EXISTS mandato_privado.pedidos_recuperacao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  solicitacao_id bigint NOT NULL REFERENCES public.solicitacoes(id) ON DELETE RESTRICT,
  estado text NOT NULL DEFAULT 'pendente' CHECK (estado IN ('pendente','aprovado','rejeitado','concluido','expirado')),
  telefone_confirmado_verificador bytea,
  justificativa text,
  conferente_id uuid,
  criado_em timestamptz NOT NULL DEFAULT now(),
  decidido_em timestamptz,
  concluido_em timestamptz
);
CREATE INDEX IF NOT EXISTS pedidos_recuperacao_solicitacao_estado_idx ON mandato_privado.pedidos_recuperacao(solicitacao_id,estado);
CREATE TABLE IF NOT EXISTS mandato_privado.codigos_recuperacao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id uuid NOT NULL REFERENCES mandato_privado.pedidos_recuperacao(id) ON DELETE RESTRICT,
  codigo_verificador bytea NOT NULL CHECK (octet_length(codigo_verificador) = 32),
  criado_em timestamptz NOT NULL DEFAULT now(),
  expira_em timestamptz NOT NULL,
  usado_em timestamptz,
  tentativas smallint NOT NULL DEFAULT 0 CHECK (tentativas BETWEEN 0 AND 5),
  CHECK (expira_em > criado_em AND expira_em <= criado_em + interval '5 minutes')
);
CREATE INDEX IF NOT EXISTS codigos_recuperacao_pedido_idx ON mandato_privado.codigos_recuperacao(pedido_id,criado_em DESC);
CREATE TABLE IF NOT EXISTS mandato_privado.auditoria_recuperacao (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  pedido_id uuid REFERENCES mandato_privado.pedidos_recuperacao(id) ON DELETE RESTRICT,
  solicitacao_id bigint REFERENCES public.solicitacoes(id) ON DELETE RESTRICT,
  evento text NOT NULL,
  operador_id uuid,
  criado_em timestamptz NOT NULL DEFAULT now(),
  contexto jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS auditoria_recuperacao_solicitacao_idx ON mandato_privado.auditoria_recuperacao(solicitacao_id,criado_em DESC);

ALTER TABLE mandato_privado.chaves_acompanhamento ENABLE ROW LEVEL SECURITY;
ALTER TABLE mandato_privado.pedidos_recuperacao ENABLE ROW LEVEL SECURITY;
ALTER TABLE mandato_privado.codigos_recuperacao ENABLE ROW LEVEL SECURITY;
ALTER TABLE mandato_privado.auditoria_recuperacao ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ALL TABLES IN SCHEMA mandato_privado FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA mandato_privado FROM PUBLIC, anon, authenticated;
-- Sem políticas públicas: o backend privado deve operar com identidade de serviço restrita.
-- HMAC/verificadores são calculados na API, nunca enviados ao navegador.
-- Não copiar códigos, chaves, números pessoais ou tokens para auditoria.contexto.
-- Antes de executar: revisar a extensão pgcrypto para gen_random_uuid(), privilégios e proteção de backup.
COMMIT;
