# Auditoria de permissões — 2026-11-08 (somente leitura)

Escopo: branch `feature/recuperacao-whatsapp-manual`; projeto Neon de testes `proud-firefly-64745516`, banco `neondb`. Não é aprovação para produção.

## Execução observada

1. Consulta inicial com papel `mandato_api` falhou: SQLSTATE 42704 (papel inexistente). Não contabilizada como aprovação.
2. Consulta a `pg_roles` identificou o papel `mandato_api_homologacao` (executor da consulta: `neondb_owner`).
3. Consulta a `pg_proc` / `pg_namespace` com `has_function_privilege` verificou 14 funções do esquema `mandato_testes`: **7 executáveis** por `mandato_api_homologacao`, **7 não executáveis**; **0 executáveis por PUBLIC**.

Executáveis: `consulta_historico_segura`, `consulta_nomes_anexos_segura`, `consulta_respostas_segura`, `consulta_segura`, `consultar_decisao_identidade_privada`, `pedir_recuperacao`, `registrar_decisao_sintetica_900007`.

A função auxiliar `registrar_decisao_sintetica_900007` segue executável pelo papel da API: **bloqueio de migração**, até revisão de finalidade, chamadas e permissões. As três funções `emitir_chave_legada_teste_900004/5/6` não são executáveis pelo papel da API. Esta observação não identifica quem alterou permissões nem quando.

SQL reproduzível (somente leitura):

```sql
SELECT p.proname,
       has_function_privilege('mandato_api_homologacao', p.oid, 'EXECUTE') AS api_exec,
       has_function_privilege('public', p.oid, 'EXECUTE') AS public_exec
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='mandato_testes'
ORDER BY p.proname;
```

## Validações pendentes / critérios de liberação

- Executar `npm test` com Node 22 em ambiente isolado, guardar saída e código de retorno; **não executado nesta rodada**.
- Testar HTTP real contra Neon de testes com dados fictícios e papel restrito, inclusive CORS, autenticação administrativa, negação sem credenciais, isolamento e falhas de banco; **não executado nesta rodada**.
- Investigar dependências da função auxiliar ainda autorizada e propor correção mínima sem alterar permissões automaticamente.
- Preparar plano de migração com backup, critérios de aceite, janela, rollback ensaiado em homologação e autorização explícita antes de qualquer mudança em produção.

Nenhuma alteração no Neon, Supabase de produção, dados reais ou branch main. Nenhuma ativação de segurança nova.
