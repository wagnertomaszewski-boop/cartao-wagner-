# Auditoria de privilégios diretos nas tabelas — 2026-11-07

Escopo: projeto Neon de testes `proud-firefly-64745516`, esquema `mandato_testes`. Consulta SQL somente leitura de `has_table_privilege` sobre os papéis `mandato_cidadao_a` e `mandato_cidadao_b` e as sete tabelas reais do esquema.

## Teste efetivamente executado

Para cada papel/tabela, verificados `SELECT`, `INSERT`, `UPDATE` e `DELETE`: 14 linhas, 56 verificações booleanas. Todas retornaram `false`.

Tabelas: `acessos_protocolo`, `anexos`, `historico_status`, `pedidos_recuperacao`, `recuperacao_contatos`, `respostas`, `solicitacoes`.

## Interpretação

Os dois papéis de cidadão não têm privilégios diretos de leitura ou escrita nessas tabelas. Isto **não comprova** por si só a ausência de vazamento por funções `SECURITY DEFINER`, nem autenticação administrativa ou segurança da API HTTP.

## Pendências

Suíte Node original, integração HTTP–Neon real, autenticação independente e plano de migração/rollback ainda requerem validação. Nenhum dado, permissão, esquema, produção Supabase ou branch `main` foi alterado nesta verificação.
