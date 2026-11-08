-- Auditoria de regressão de privilégios; SOMENTE LEITURA.
-- Executar exclusivamente no projeto Neon de homologação proud-firefly-64745516.
-- Não altera funções, ACLs, dados ou infraestrutura.
WITH funcoes AS (
 SELECT p.oid, p.proname,
        has_function_privilege('mandato_api_homologacao', p.oid, 'EXECUTE') AS api_execute,
        EXISTS (
          SELECT 1 FROM aclexplode(COALESCE(p.proacl, acldefault('f', p.proowner))) acl
          WHERE acl.grantee = 0 AND acl.privilege_type = 'EXECUTE'
        ) AS public_execute
 FROM pg_proc p
 JOIN pg_namespace n ON n.oid = p.pronamespace
 WHERE n.nspname = 'mandato_testes'
)
SELECT count(*) AS total_funcoes,
       count(*) FILTER (WHERE api_execute) AS funcoes_api,
       count(*) FILTER (WHERE public_execute) AS funcoes_publicas,
       count(*) FILTER (WHERE api_execute AND
          (proname LIKE 'emitir_chave_legada_teste_%'
           OR proname LIKE 'aprovacao_emissao_teste_%'
           OR proname LIKE 'registrar_decisao_sintetica_%')) AS auxiliares_teste_expostas_api,
       bool_and(NOT public_execute) AS sem_execucao_publica,
       NOT EXISTS (
         SELECT 1 FROM funcoes WHERE proname IN
           ('criar_solicitacao_segura','decidir_recuperacao') AND api_execute
       ) AS operacoes_criticas_bloqueadas_api
FROM funcoes;
-- IMPORTANTE: sem_execucao_publica=true não equivale a aprovação de segurança.
-- Bloquear migração enquanto auxiliares_teste_expostas_api > 0 sem justificativa formal.
