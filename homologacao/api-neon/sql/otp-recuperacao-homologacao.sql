-- RASCUNHO NÃO EXECUTADO. Apenas projeto Neon de homologação.
-- Não executar em Supabase produção. Revisar permissões e backup antes.
BEGIN;
CREATE TABLE IF NOT EXISTS mandato_testes.desafios_recuperacao (
  solicitacao_id bigint PRIMARY KEY REFERENCES mandato_testes.solicitacoes(id) ON DELETE CASCADE,
  digest bytea NOT NULL CHECK (octet_length(digest)=32),
  sal bytea NOT NULL CHECK (octet_length(sal)>=16),
  expira_em timestamptz NOT NULL,
  tentativas integer NOT NULL DEFAULT 0 CHECK (tentativas>=0 AND tentativas<=5),
  consumido_em timestamptz,
  criado_em timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE mandato_testes.desafios_recuperacao ENABLE ROW LEVEL SECURITY;
ALTER TABLE mandato_testes.desafios_recuperacao FORCE ROW LEVEL SECURITY;
REVOKE ALL ON mandato_testes.desafios_recuperacao FROM PUBLIC;
-- Nenhuma política de acesso direto nem GRANT para cidadãos/admin.
-- Acesso futuro apenas via serviço com papel restrito e função auditada.
COMMIT;

-- Contrato obrigatório do serviço (NÃO IMPLEMENTADO neste SQL):
-- 1. Emitir hash HMAC-SHA256 (segredo exclusivamente no servidor) + sal aleatório,
--    e substituir desafio anterior em transação, com limites por destino e protocolo.
-- 2. Verificar código e incrementar tentativas em transação com bloqueio FOR UPDATE;
--    consumo e entrega de credencial devem ser atômicos/idempotentes.
-- 3. Em falha de entrega, invalidar desafio de modo transacional.
-- 4. Não enviar telefone, código, digest, chave ou protocolo para logs.
-- 5. Confirmar posse de canal não substitui vínculo comprovado do pedido ao morador.
-- 6. Não permitir função SECURITY DEFINER sem auditoria de search_path, owner e grants.
