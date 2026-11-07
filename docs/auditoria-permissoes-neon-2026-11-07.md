# Verificação independente de privilégios — 2026-11-07

Escopo: projeto Neon de testes `proud-firefly-64745516`, banco `neondb`, esquema `mandato_testes`. Consultas somente leitura, sem alteração de dados ou permissões.

## Consultas efetivamente executadas

1. `SELECT current_database(), current_user, ...` com contagem de tabelas e funções no esquema de testes. Resultado: `neondb`, `neondb_owner`, 7 tabelas, 8 funções.
2. Matriz de `has_function_privilege(..., 'EXECUTE')` para três papéis e oito funções: 24 combinações verificadas.

## Resultado observado

- `mandato_cidadao_a` e `mandato_cidadao_b`: execução permitida somente em `consulta_segura`, `consulta_respostas_segura`, `consulta_historico_segura`, `consulta_nomes_anexos_segura` e `pedir_recuperacao`.
- Ambos os papéis cidadãos: execução negada em `consulta_anexos_segura`, `criar_solicitacao_segura` e `decidir_recuperacao`.
- `mandato_admin_teste`: execução permitida somente em `decidir_recuperacao`; negada nas outras sete funções.
- Nenhuma discrepância observada na matriz em relação à política documentada.

## Limitações e bloqueios

Esta verificação inspeciona concessões de execução, não executa a suíte Node, não comprova segurança de `SECURITY DEFINER`, não testa identidade administrativa, API HTTPS, integração HTTP–Neon nem migração. O projeto de testes tem branch Neon chamada `production`, mas não é a produção Supabase. Nenhuma alteração foi realizada nesse banco nesta rodada.

Arquivos de teste e plano foram inspecionados no GitHub na branch `feature/recuperacao-whatsapp-manual`; execução integral da suíte continua pendente. A rota administrativa de decisão deve permanecer desabilitada até autenticação e confirmação independente de identidade verificadas.
