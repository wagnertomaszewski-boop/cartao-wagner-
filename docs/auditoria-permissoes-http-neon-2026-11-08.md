# Auditoria de permissões e contrato HTTP–Neon — 2026-11-08

## Escopo e método
Somente branch `feature/recuperacao-whatsapp-manual` e projeto Neon de homologação `proud-firefly-64745516`. Consulta SQL exclusivamente de leitura, sem execução das funções auditadas. Leitura dos arquivos `homologacao/api-neon/package.json`, `server.test.mjs`, `operacoes-neon-contrato.test.mjs` e `servico-https.mjs` no GitHub.

SQL executado:
```sql
SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args,
       has_function_privilege('mandato_api_homologacao',p.oid,'EXECUTE') AS api_execute
FROM pg_proc p
JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='mandato_testes'
ORDER BY p.proname;
```

## Resultado verificável
14 funções retornadas; 11 com EXECUTE para `mandato_api_homologacao` e 3 sem EXECUTE. Sem EXECUTE: `consulta_anexos_segura`, `criar_solicitacao_segura`, `decidir_recuperacao`.

Com EXECUTE, além das rotas de consulta/recuperação, constam as funções auxiliares `aprovacao_emissao_teste_900006`, `emitir_chave_legada_teste_900004`, `emitir_chave_legada_teste_900005`, `emitir_chave_legada_teste_900006` e `registrar_decisao_sintetica_900007`. Também há permissão para `consultar_decisao_identidade_privada`. **Isto é uma superfície de permissão a revisar, não uma prova de exploração.**

## Contrato do código lido
`package.json`: Node >=22 <23; `npm test` executa `node --test *.test.mjs`; dependência `pg@8.16.3`. Os testes de `server.test.mjs` usam servidor local e fetch, verificando autenticação, CORS, erros e health. `operacoes-neon-contrato.test.mjs` usa executores simulados, verifica SQL parametrizado e filtragem de campos; **não constitui teste de integração com banco real**. `servico-https.mjs` delega inicialização a `iniciar-homologacao.mjs` e depende de TLS terminado pelo proxy.

## Pendências e critérios de avanço
1. Inspecionar definições e GRANTs das funções auxiliares; avaliar retirada de EXECUTE da conta de API somente após autorização específica, em homologação.
2. Executar a suíte Node e registrar logs de resultado, sem presumir aprovação pela leitura do código.
3. Exercitar HTTP contra homologação isolada e banco de testes, usando credenciais restritas e dados sintéticos, comprovando autenticação, negação de acesso cruzado e ausência de vazamento.
4. Revisar autenticação administrativa, segredos e isolamento de funções `SECURITY DEFINER`; definir rollback e aprovação explícita antes de qualquer migração.

## Limites desta rodada
Nenhuma função de negócio foi invocada. Nenhum teste Node/HTTP foi executado. Não houve alteração de permissões SQL, dados reais, Supabase de produção, branch `main`, configuração de hospedagem ou ativação de segurança. Sem percentual de conclusão atribuído.
