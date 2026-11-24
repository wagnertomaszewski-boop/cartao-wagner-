-- SOMENTE LEITURA. Executável no SQL Editor para inventário sem dados pessoais.
-- NÃO concede permissões, NÃO gera protocolo, NÃO emite chaves.
WITH base AS (
 SELECT id,protocolo,whatsapp FROM public.solicitacoes
), duplicados AS (
 SELECT protocolo FROM base WHERE nullif(btrim(protocolo),'') IS NOT NULL
 GROUP BY protocolo HAVING count(*)>1
)
SELECT
 (SELECT count(*)::int FROM base) AS total_solicitacoes,
 (SELECT count(*)::int FROM base WHERE nullif(btrim(protocolo),'') IS NULL) AS sem_protocolo,
 (SELECT count(*)::int FROM duplicados) AS protocolos_duplicados,
 (SELECT count(*)::int FROM mandato_privado.chaves_acompanhamento WHERE revogada_em IS NULL) AS chaves_ativas,
 (SELECT count(*)::int FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='public' AND p.proname IN (
   'consulta_publica_protocolo','consulta_publica_historico_protocolo',
   'consulta_publica_respostas_protocolo','consultar_protocolo')
  AND (has_function_privilege('anon',p.oid,'EXECUTE')
    OR has_function_privilege('authenticated',p.oid,'EXECUTE'))) AS funcoes_legadas_publicas,
 (SELECT public FROM storage.buckets WHERE id='documentos-respostas') AS bucket_respostas_publico,
 (SELECT EXISTS(SELECT 1 FROM pg_roles
    WHERE rolname='mandato_api_privada' AND rolcanlogin AND NOT rolbypassrls AND NOT rolsuper))
  AS papel_backend_restrito,
 (SELECT count(*)::int FROM base WHERE
   regexp_replace(coalesce(whatsapp,''),'[^0-9]','','g') ~ '^[1-9][0-9]{9}$') AS contatos_ddd_8_digitos,
 (SELECT count(*)::int FROM base WHERE
   regexp_replace(coalesce(whatsapp,''),'[^0-9]','','g') !~ '^([1-9][0-9]{9,10}|55[1-9][0-9]{9,10})$')
  AS contatos_atipicos;
-- Conferência manual é obrigatória para contatos inconsistentes.
-- Os dados deste inventário não comprovam identidade ou titularidade do telefone.
