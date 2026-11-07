# Validação SQL real e smoke HTTP–Neon preparado — 2026-11-07

Projeto Neon isolado: `proud-firefly-64745516`. Conta de execução: `mandato_api_homologacao`. Branch GitHub: `feature/recuperacao-whatsapp-manual`.

## SQL real executado
Via conector Neon, transações com `SET LOCAL ROLE mandato_cidadao_a`:
- `current_user = mandato_cidadao_a`, `session_user = mandato_api_homologacao`.
- `has_function_privilege(..., consulta_segura(text,text), EXECUTE) = true`.
- `consulta_segura` com protocolo e chave fictícios inexistentes: 0 registros.
- `consulta_respostas_segura`: 0 registros.
- `consulta_nomes_anexos_segura`: 0 registros.
- `consulta_historico_segura`: 0 registros.

Todas as consultas SQL acima foram executadas com sucesso, sem escrita.

## Teste HTTP–Neon preparado, mas não executado
Arquivo `homologacao/api-neon/smoke-http-neon-real.mjs`, commit `a552ad986f9d69b0ebf50bfb292d42eb6d7c67f9`. Sobe servidor apenas em `127.0.0.1` com porta efêmera, usa credenciais de ambiente e driver `pg`, consulta protocolo fictício inexistente e exige 200 com arrays vazios; verifica também 401 na rota admin sem token. Não contém credenciais e encerra servidor/pool no finally.

**Bloqueio:** este ambiente não possui conexão HTTP com Neon via driver `pg` configurada com credenciais da conta restrita. O teste ponta a ponta ainda **não foi executado**; sucesso SQL via conector não equivale a sucesso HTTP.

Não foram alterados produção Supabase, dados reais, branch `main` ou habilitação do app.
