# Auditoria de políticas RLS — 2026-11-07

Projeto isolado: `proud-firefly-64745516`, esquema `mandato_testes`. Consulta SQL **somente leitura** em `pg_class`, `pg_namespace` e `pg_policies`.

| Tabela | RLS | FORCE RLS | Há políticas? |
|---|---|---|---|
| acessos_protocolo | sim | sim | não |
| anexos | sim | sim | sim |
| historico_status | sim | sim | não |
| pedidos_recuperacao | sim | sim | sim |
| recuperacao_contatos | sim | sim | não |
| respostas | sim | sim | sim |
| solicitacoes | sim | sim | sim |

**Interpretação:** ausência de política geralmente significa negação de acesso direto sob RLS, mas não substitui auditoria de privilégios, funções SECURITY DEFINER e caminhos da API. Esta consulta não executou funções nem alterou dados.

**Bloqueio para testes originais:** `git ls-remote https://github.com/wagnertomaszewski-boop/cartao-wagner-.git refs/heads/feature/recuperacao-whatsapp-manual` falhou no contêiner por DNS (`Could not resolve host: github.com`). Não houve checkout verificável nem execução da suíte original nesta rodada.

**Próximos passos:** revisar políticas completas e owner/SECURITY DEFINER; executar suíte original em checkout verificável; integração HTTP-Neon real; testar migração OTP em branch Neon descartável antes de qualquer ativação.

**Escopo:** sem alteração em Supabase produção, dados reais, `main`, ou configurações do Neon.
