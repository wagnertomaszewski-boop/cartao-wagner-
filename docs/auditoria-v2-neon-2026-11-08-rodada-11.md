# Auditoria de homologação — 2026-11-08 (rodada 11)

Escopo: branch `feature/recuperacao-whatsapp-manual`; projeto Neon `proud-firefly-64745516`. Nenhuma operação de escrita no banco ou produção foi executada.

## Evidências obtidas

1. Leitura direta de `homologacao/api-neon/server.mjs` na branch indicada: a rota `/health` responde em modo homologação; rotas administrativas exigem token Bearer e `verificarAdmin`; decisão administrativa exige também `verificarIdentidade`; handlers ausentes retornam 503; entradas POST exigem JSON e limite de 4096 bytes; origens CORS não autorizadas recebem 403. Trata-se de **inspeção estática**, não de teste HTTP executado.
2. Leitura direta de `homologacao/api-neon/package.json`: o comando de testes declarado é `node --test *.test.mjs`, com Node >=22 <23 e dependência `pg@8.16.3`. Não houve execução da suíte nesta rodada.
3. SQL de leitura executado no projeto Neon autorizado:

```sql
SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args,
       has_function_privilege('mandato_api_homologacao',p.oid,'EXECUTE') AS api_execute
FROM pg_proc p
JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='mandato_testes'
ORDER BY p.proname;
```

Resultado: 14 funções; 11 com EXECUTE para `mandato_api_homologacao` e 3 sem EXECUTE. Funções sem EXECUTE: `consulta_anexos_segura`, `criar_solicitacao_segura`, `decidir_recuperacao`. Entre as 11 acessíveis estão as funções auxiliares `aprovacao_emissao_teste_900006`, `emitir_chave_legada_teste_900004`, `emitir_chave_legada_teste_900005`, `emitir_chave_legada_teste_900006` e `registrar_decisao_sintetica_900007`.

## Avaliação e bloqueios

**Atenção — privilégio mínimo:** a conta de API de homologação ainda pode executar cinco funções auxiliares de teste. A permissão EXECUTE isoladamente não demonstra exploração, mas requer revisão de seus corpos e dependências antes de qualquer ativação. Não foram revogadas permissões nesta rodada.

**Pendente:** executar suíte Node e verificar resultado; fazer testes HTTP reais contra instância local/isolada e conexão Neon com credenciais restritas; comprovar isolamento entre solicitações fictícias; revisar autorização administrativa e recuperação manual/automática; elaborar checklist de reversão antes da migração.

**Proibição mantida:** não modificar Supabase de produção, dados reais, branch main ou ativar nova segurança sem validação e autorização. Nenhum percentual de conclusão é inferido.
