# Revalidação de permissões EXECUTE — 2026-11-07

Consulta somente leitura em `pg_proc`, `pg_namespace` e `has_function_privilege` no projeto Neon de testes `proud-firefly-64745516`, esquema `mandato_testes`. Oito funções x três papéis = 24 resultados.

| Função | cidadão A | cidadão B | admin teste |
|---|---|---|---|
| consulta_anexos_segura | não | não | não |
| consulta_historico_segura | sim | sim | não |
| consulta_nomes_anexos_segura | sim | sim | não |
| consulta_respostas_segura | sim | sim | não |
| consulta_segura | sim | sim | não |
| criar_solicitacao_segura | não | não | não |
| decidir_recuperacao | não | não | sim |
| pedir_recuperacao | sim | sim | não |

**Limites:** metadados de privilégio, não chamadas reais sob papéis nem testes HTTP. Esta auditoria confirma configuração existente, sem provar autenticação, entrega de chaves, ausência de bypass via SECURITY DEFINER ou segurança de produção. Nenhuma permissão foi alterada.
