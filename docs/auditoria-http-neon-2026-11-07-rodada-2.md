# Auditoria complementar HTTP–Neon — 2026-11-07

Escopo exclusivo: branch GitHub `feature/recuperacao-whatsapp-manual`, projeto Neon de testes `proud-firefly-64745516`. Sem alterações no banco.

## Evidências efetivamente obtidas

1. Leitura do `homologacao/api-neon/package.json`: runtime Node >=22 <23; script `start` chama `node servico-https.mjs`; script `test` chama `node --test *.test.mjs`; dependência pg 8.16.3.
2. Leitura do `homologacao/api-neon/servico-https.mjs`: porta validada, escuta em 0.0.0.0, TLS terminado pelo proxy do provedor; importa `iniciarHomologacao`. O código não demonstra, por si só, autenticação ou isolamento.
3. Consulta SQL somente leitura: `SELECT current_database(), current_user, current_setting('server_version')` retornou `neondb`, `neondb_owner`, PostgreSQL 18.6. A ferramenta executou como proprietário; isso **não** constitui teste de login da API restrita.
4. Consulta SQL somente leitura em `pg_proc` / `pg_namespace` usando `has_function_privilege('mandato_api_homologacao', oid, 'EXECUTE')` e `prosecdef`: oito funções verificadas. Cinco autorizadas (consulta_segura, consulta_historico_segura, consulta_nomes_anexos_segura, consulta_respostas_segura, pedir_recuperacao); três negadas (consulta_anexos_segura, criar_solicitacao_segura, decidir_recuperacao). Todas as oito estão marcadas `SECURITY DEFINER`.

## Riscos e bloqueios

- `SECURITY DEFINER` exige revisão do corpo de cada função, `search_path`, proprietário, parâmetros e controle de identidade; privilégios de EXECUTE não bastam para comprovar isolamento.
- Nenhuma requisição HTTP foi enviada nesta rodada; nenhuma suíte Node foi executada. A hospedagem Render não foi confirmada implantada. Não alegar integração ponta a ponta validada.
- Antes de implantar: confirmar nomes reais das variáveis no código, impedir operações administrativas sem autenticação independente, usar credenciais restritas e banco exclusivamente fictício, e executar testes negativos entre cidadãos.
- A orientação anterior de remover `sslmode=require&channel_binding=require` da URL de conexão **não deve ser seguida** sem justificativa técnica: preservar TLS e validação da conexão.

Nenhum dado real, Supabase, branch main ou recurso pago foi modificado; segurança nova não ativada.
