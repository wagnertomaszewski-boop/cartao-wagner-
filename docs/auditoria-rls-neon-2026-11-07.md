# Verificação RLS — 2026-11-07

Projeto Neon de testes: `proud-firefly-64745516`; esquema: `mandato_testes`.

## Consulta executada

Consulta somente leitura ao catálogo `pg_class` e `pg_namespace`, selecionando `relrowsecurity` e `relforcerowsecurity` das tabelas ordinárias do esquema.

## Resultado

As sete tabelas `acessos_protocolo`, `anexos`, `historico_status`, `pedidos_recuperacao`, `recuperacao_contatos`, `respostas` e `solicitacoes` retornaram `rls_ativo=true` e `rls_forcado=true`.

## Limitações

RLS ativo e forçado não demonstra, sozinho, que as políticas estão corretas nem garante proteção contra erros em funções `SECURITY DEFINER`. Não houve teste de API HTTP, suíte Node, autenticação ou migração nesta etapa. Nenhum dado, permissão ou esquema foi alterado. Produção Supabase e branch `main` não foram tocadas.
