# Gate de privilégios HTTP–Neon — 2026-11-08

Escopo exclusivo: projeto Neon de testes `proud-firefly-64745516`, esquema `mandato_testes`. **Não executar migração ou ativar produção.**

## Evidência obtida (consulta somente leitura)

Consulta executada com sucesso:

```sql
SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args,
       has_function_privilege('mandato_api_homologacao',p.oid,'EXECUTE') AS api_execute,
       p.prosecdef AS security_definer
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='mandato_testes'
ORDER BY p.proname;
```

Resultado: 14 funções SECURITY DEFINER; 11 executáveis por `mandato_api_homologacao` e 3 não executáveis. As cinco funções auxiliares abaixo são executáveis pela API restrita:

- `aprovacao_emissao_teste_900006(bigint)`
- `emitir_chave_legada_teste_900004(text,bigint,text)`
- `emitir_chave_legada_teste_900005(text,bigint,text)`
- `emitir_chave_legada_teste_900006(text,bigint,text)`
- `registrar_decisao_sintetica_900007(text,text,text)`

Isso é **superfície de risco a revisar**, não exploração demonstrada. Não foi chamada nenhuma dessas funções.

## Gates antes de habilitar HTTP–Neon

1. Inspecionar os corpos das cinco funções, seus proprietários e `search_path`; verificar se têm efeitos sobre chaves ou decisões fora de registros sintéticos.
2. Confirmar a lista mínima de funções exigidas pelo servidor HTTP; preparar proposta de `REVOKE EXECUTE` para as auxiliares desnecessárias **somente em homologação**, após autorização específica e testes de regressão.
3. Executar testes Node e HTTP de ponta a ponta usando credenciais de menor privilégio, com solicitações exclusivamente fictícias. Confirmar rejeição de token ausente/inválido, origem indevida, identidade não confirmada e acesso cruzado.
4. Repetir a auditoria de privilégios e comprovar que as rotas de recuperação não emitem chaves sem aprovação válida.
5. Elaborar migração reversível com backup, janela, critérios de abortar e rollback. Aprovação humana separada é obrigatória antes de qualquer ativação.

## Estado desta rodada

- GitHub: branch `feature/recuperacao-whatsapp-manual` confirmada; `server.mjs` e `package.json` inspecionados.
- Neon: uma consulta de catálogo somente leitura executada com sucesso.
- Node/HTTP ponta a ponta: **não executados** nesta rodada.
- Nenhuma alteração de permissões, dados, Supabase, `main` ou segurança ativa.
