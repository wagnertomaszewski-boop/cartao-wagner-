-- PROPOSTA NÃO EXECUTADA. Somente homologação Neon, nunca Supabase produção.
-- Bloqueada para ativação até revisar função transacional e permissões.
-- Sem política RLS, o acesso à tabela é negado inclusive ao proprietário
-- comum por FORCE RLS. Não ativar endpoints antes de criar caminho restrito.
BEGIN;
CREATE TABLE mandato_testes.desafios_recuperacao (
  solicitacao_id bigint PRIMARY KEY REFERENCES mandato_testes.solicitacoes(id),
  digest bytea NOT NULL CHECK (octet_length(digest)=32),
  sal bytea NOT NULL CHECK (octet_length(sal)>=16),
  expira_em timestamptz NOT NULL,
  tentativas integer NOT NULL DEFAULT 0 CHECK (tentativas BETWEEN 0 AND 5),
  consumido_em timestamptz,
  criado_em timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE mandato_testes.desafios_recuperacao ENABLE ROW LEVEL SECURITY;
ALTER TABLE mandato_testes.desafios_recuperacao FORCE ROW LEVEL SECURITY;
REVOKE ALL ON mandato_testes.desafios_recuperacao FROM PUBLIC;
-- Nenhum GRANT direto a papéis cidadão ou admin.
COMMIT;

-- Revisão de segurança antes da execução:
-- 1. A criação sem IF NOT EXISTS falha explicitamente se já existir tabela:
--    evita aceitar silenciosamente estrutura antiga/incompatível.
-- 2. Não usar ON DELETE CASCADE para que a remoção de uma solicitação não
--    apague silenciosamente evidências de recuperação.
-- 3. Definir serviço e função de banco restritos, com autorização auditada,
--    política RLS mínima ou executor BYPASSRLS dedicado de privilégios mínimos,
--    nunca compartilhado com usuário HTTP. Revisar owner/search_path/grants.
-- 4. Emissão, limite de tentativas e consumo exigem transações com lock;
--    nenhuma lógica de código em memória pode substituir isso na produção.
-- 5. Acesso à credencial exige verificação independente de vínculo ao morador.
-- 6. Segredo HMAC apenas no servidor; sem códigos, telefone ou chaves nos logs.
-- 7. Executar primeiro em branch Neon descartável e testar rollback.
