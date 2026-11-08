-- Homologação exclusiva: proud-firefly-64745516 / mandato_testes.
-- Consulta somente leitura. Executar no Neon de testes, nunca em produção.
-- Resultado observado em 2026-11-08: 14 funções, 8 EXECUTE API, 0 PUBLIC.
-- Bloqueio: registrar_decisao_sintetica_900007 ainda acessível à API.
WITH permissoes AS (
 SELECT p.proname,
        has_function_privilege('mandato_api_homologacao', p.oid, 'EXECUTE') AS api,
        has_function_privilege('public', p.oid, 'EXECUTE') AS publico
 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='mandato_testes'
)
SELECT count(*) AS funcoes,
       count(*) FILTER (WHERE api) AS executaveis_api,
       count(*) FILTER (WHERE publico) AS executaveis_publico,
       count(*) FILTER (WHERE api AND proname LIKE '%teste%') AS auxiliares_teste_api,
       count(*) FILTER (WHERE api AND proname LIKE '%sintetica%') AS auxiliares_sinteticas_api,
       CASE WHEN count(*) FILTER (WHERE publico OR (api AND (proname LIKE '%teste%' OR proname LIKE '%sintetica%')))=0
            THEN 'APTO_QUANTO_A_ESTE_CRITERIO' ELSE 'BLOQUEAR_MIGRACAO' END AS gate
FROM permissoes;
-- A contagem não valida autenticação, isolamento por protocolo nem HTTP.
-- Antes de migração: revisar o uso de registrar_decisao_sintetica_900007,
-- remover eventual privilégio apenas após análise de dependências,
-- executar suíte Node e integração HTTP com dados exclusivamente fictícios.
