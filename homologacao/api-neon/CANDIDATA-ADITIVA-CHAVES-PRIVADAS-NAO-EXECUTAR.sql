-- CANDIDATA DE MIGRAÇÃO ADITIVA — NÃO EXECUTAR SEM APROVAÇÃO DE PRODUÇÃO.
-- Preparada contra o esquema real de Solicitacoes-Mandato (PostgreSQL 17).
-- Não cria chaves, não modifica solicitações, não revoga RPCs existentes.
-- Armazena SOMENTE hash SHA-256 calculado pelo backend confiável (32 bytes).
-- O backend deve gerar chave aleatória de 32 bytes via crypto.randomBytes,
-- entregar uma única vez após verificação independente de identidade,
-- e calcular crypto.createHash('sha256').update(chaveBytes).digest().
-- Não aceitar hash/chave enviado pelo navegador como prova de identidade.
-- IMPORTANTE: criação de tabela não significa liberação da API.

BEGIN;
CREATE SCHEMA IF NOT EXISTS mandato_privado;
REVOKE ALL ON SCHEMA mandato_privado FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS mandato_privado.chaves_acompanhamento (
  solicitacao_id bigint PRIMARY KEY REFERENCES public.solicitacoes(id) ON DELETE RESTRICT,
  chave_hash bytea NOT NULL CHECK (octet_length(chave_hash) = 32),
  emitida_em timestamptz NOT NULL DEFAULT now(),
  emitida_por uuid NOT NULL,
  revogada_em timestamptz,
  CONSTRAINT chave_revogacao_valida CHECK (revogada_em IS NULL OR revogada_em >= emitida_em)
);
REVOKE ALL ON mandato_privado.chaves_acompanhamento FROM PUBLIC, anon, authenticated;
ALTER TABLE mandato_privado.chaves_acompanhamento ENABLE ROW LEVEL SECURITY;
ALTER TABLE mandato_privado.chaves_acompanhamento FORCE ROW LEVEL SECURITY;
-- Nenhuma política de acesso ao cidadão: operações devem passar por backend
-- com papel dedicado, revisado e mínimo. NÃO conceder BYPASSRLS.
-- NÃO habilitar funções SECURITY DEFINER públicas para acessar esta tabela.
COMMIT;

-- CHECKLIST EXTERNO OBRIGATÓRIO (NÃO EXECUTADO):
-- [ ] Backup e restauração do banco e Storage testados.
-- [ ] Confirmar dono, grants e papel de backend; sem uso de service_role no cliente.
-- [ ] Definir procedimento seguro para emissão/recuperação de chaves legadas.
-- [ ] Implementar consulta parametrizada, com autorização e testes negativos.
-- [ ] Ensaiar rollout e rollback sem apagar dados posteriores ao backup.
-- [ ] Somente depois restringir RPCs antigas com plano de compatibilidade.
