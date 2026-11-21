-- Mandato em Ação: pré-verificação SOMENTE LEITURA.
-- Não contém DDL/DML e não autoriza mudança em produção.
-- Resultados "OK" não substituem ensaio de restauração, prova do gateway Storage,
-- validação da API e compatibilidade das versões Android já instaladas.
WITH rpcs AS (
 SELECT p.oid, p.prosecdef,
        has_function_privilege('anon',p.oid,'EXECUTE') AS anon_exec,
        has_function_privilege('authenticated',p.oid,'EXECUTE') AS autenticado_exec
 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='public'
   AND p.proname IN (
    'consulta_publica_protocolo',
    'consultar_protocolo',
    'consulta_publica_historico_protocolo',
    'consulta_publica_respostas_protocolo'
   )
),
checks AS (
 SELECT 'RPCs legadas sem execução pública' AS verificacao,
        ((SELECT count(*) FROM rpcs)=4
          AND COALESCE((SELECT bool_and(NOT anon_exec AND NOT autenticado_exec) FROM rpcs),false)) AS ok
 UNION ALL
 SELECT 'Bucket documentos-respostas privado',
        EXISTS(SELECT 1 FROM storage.buckets WHERE id='documentos-respostas' AND public=false)
 UNION ALL
 SELECT 'Papel mandato_api_privada restrito',
        EXISTS(SELECT 1 FROM pg_roles WHERE rolname='mandato_api_privada' AND NOT rolsuper AND NOT rolbypassrls)
 UNION ALL
 SELECT 'Campo recibo_hash bytea disponível',
        EXISTS(SELECT 1 FROM information_schema.columns
          WHERE table_schema='mandato_privado' AND table_name='pedidos_recuperacao'
            AND column_name='recibo_hash' AND udt_name='bytea')
 UNION ALL
 SELECT 'Tabelas privadas adicionais presentes',
        to_regclass('mandato_privado.arquivos') IS NOT NULL
          AND to_regclass('mandato_privado.operacoes') IS NOT NULL
          AND to_regclass('mandato_privado.limites') IS NOT NULL
 UNION ALL
 SELECT 'RLS e política restritiva de documentos',
        EXISTS(SELECT 1 FROM pg_class WHERE oid=to_regclass('storage.objects') AND relrowsecurity)
          AND EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects'
            AND policyname='documentos_resposta_leitura_restrita' AND permissive='RESTRICTIVE')
)
SELECT verificacao, CASE WHEN ok THEN 'OK' ELSE 'PENDENTE' END AS resultado
FROM checks ORDER BY verificacao;
