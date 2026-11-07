# Rodada de validação V2 — 2026-11-07 15:24 BRT

Escopo: somente branch `feature/recuperacao-whatsapp-manual` e Neon isolado `proud-firefly-64745516`.

## Alterações de código
- `iniciar-homologacao.mjs`: a API Neon remota exige **exatamente** `mandato_api_homologacao`, além da correspondência com `NEON_USUARIO_SERVICO_HOMOLOGACAO`; uma variável de ambiente arbitrária já não permite autorizar outro usuário.
- `integracao-http-postgres.test.mjs`: cenário remoto válido atualizado para essa conta e novo teste para rejeitar usuário arbitrário mesmo com variável concordante.
- Commits: `b9a9363940aee1320813f7cedade271601510ac2` e `7b387613759335bbec7984dd15a02297d232265a`.

## Teste realmente executado
Transação PostgreSQL no Neon com `role_name=mandato_api_homologacao`:
1. `SET LOCAL ROLE mandato_cidadao_a`: sucesso.
2. Consulta `current_user`, `transaction_read_only`, membership administrativo: `mandato_cidadao_a`, `off`, `false`.
3. `consulta_segura` com protocolo e chave fictícios inexistentes: zero registros.

**Atenção:** `transaction_read_only=off` indica que a transação não é inerentemente read-only; a segurança da API depende de grants e whitelist de consultas. Isso não comprova acesso de escrita indevido.

## Bloqueios
- Não foi possível clonar GitHub no ambiente local (`Could not resolve host: github.com`), portanto **não houve execução da suíte atualizada nesta rodada**.
- HTTP real com driver `pg` e conexão ao Neon ainda não executado.
- Não existem dois pedidos fictícios persistidos para testar isolamento real; nenhuma inserção foi feita.
- Recuperação automática WhatsApp e autenticação administrativa ainda não homologadas.

Nenhuma mudança em produção, dados reais, Supabase ou branch `main`.
