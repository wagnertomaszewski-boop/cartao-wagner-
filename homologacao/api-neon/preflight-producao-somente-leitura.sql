-- PRÉ-VOO DE MIGRAÇÃO V2 — APENAS LEITURA
-- Rodar somente no projeto Supabase correto, com papel autorizado.
-- Não copia dados, não cria chaves, não modifica tabelas, RLS ou Storage.
-- Revisar resultados agregados e comparar com o inventário aprovado.
SELECT
 (SELECT count(*) FROM public.solicitacoes) AS solicitacoes,
 (SELECT count(*) FROM public.respostas_solicitacoes) AS respostas,
 (SELECT count(*) FROM public.solicitacoes_status_historico) AS historico_status,
 (SELECT count(*) FROM public.solicitacoes_fiscalizacao_historico) AS historico_fiscalizacao,
 (SELECT count(*) FROM public.solicitacoes WHERE protocolo IS NULL OR btrim(protocolo)='') AS sem_protocolo,
 (SELECT count(*) FROM (SELECT protocolo FROM public.solicitacoes WHERE protocolo IS NOT NULL GROUP BY protocolo HAVING count(*)>1) x) AS protocolos_duplicados,
 (SELECT count(*) FROM public.respostas_solicitacoes r LEFT JOIN public.solicitacoes s ON s.id=r.solicitacao_id WHERE s.id IS NULL) AS respostas_orfas,
 (SELECT count(*) FROM public.solicitacoes_status_historico h LEFT JOIN public.solicitacoes s ON s.id=h.solicitacao_id WHERE s.id IS NULL) AS status_orfaos,
 (SELECT count(*) FROM public.solicitacoes_fiscalizacao_historico h LEFT JOIN public.solicitacoes s ON s.id=h.solicitacao_id WHERE s.id IS NULL) AS fiscalizacao_orfaos;

SELECT b.id AS bucket, b.public AS publico, count(o.id) AS objetos
FROM storage.buckets b LEFT JOIN storage.objects o ON o.bucket_id=b.id
WHERE b.id IN ('anexos-solicitacoes','documentos-respostas','comprovantes-financeiros','conteudos-mandato')
GROUP BY b.id,b.public ORDER BY b.id;

-- Detecta funções que contornam RLS e ainda podem ser chamadas sem autenticação.
SELECT p.proname AS funcao, pg_get_function_identity_arguments(p.oid) AS argumentos,
 has_function_privilege('anon',p.oid,'EXECUTE') AS anon_pode_executar,
 has_function_privilege('authenticated',p.oid,'EXECUTE') AS autenticado_pode_executar
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public' AND p.prosecdef
 AND (has_function_privilege('anon',p.oid,'EXECUTE') OR has_function_privilege('authenticated',p.oid,'EXECUTE'))
ORDER BY p.proname,argumentos;

-- Não interpretar resultado verde como prova de restauração ou de segurança de conteúdo.
