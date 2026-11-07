# Rodada de segurança — 2026-11-07, 13:46 (America/Sao_Paulo)

Escopo: branch `feature/recuperacao-whatsapp-manual`, Neon isolado `proud-firefly-64745516`. Nenhuma operação em Supabase produção ou branch main.

## Executado no Neon (consultas somente leitura)
- Sob login `mandato_api_homologacao`: `rolbypassrls=false`, `rolsuper=false`, `rolcreaterole=false`.
- Transação real: `SET LOCAL ROLE mandato_cidadao_a` executado; `current_user=mandato_cidadao_a`.
- Sob papel cidadão: `has_table_privilege(...solicitacoes,'SELECT')=false`; `has_function_privilege(...consulta_segura,'EXECUTE')=true`; `has_function_privilege(...decidir_recuperacao,'EXECUTE')=false`.

## Código acrescentado
- `homologacao/api-neon/regressao-http-seguranca.test.mjs`: três testes originais de rejeição CORS, recusa de decisão sem identidade validada e fail-closed sem handler.
- **Não executados nesta rodada:** estes três testes são cobertura adicionada, não resultados aprovados. Também não houve teste HTTP com conexão real Neon nesta rodada.

## Próximo passo
Rodar `node --test homologacao/api-neon/*.test.mjs` em checkout da branch e, separadamente, API HTTP com `pg` e credencial de serviço protegida em ambiente isolado. Testar dois registros fictícios existentes antes de qualquer migração. Não ativar segurança em produção sem autorização.
