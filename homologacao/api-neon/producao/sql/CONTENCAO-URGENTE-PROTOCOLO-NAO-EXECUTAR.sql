-- CONTENÇÃO DE INCIDENTE: CANDIDATA, NUNCA EXECUTAR AUTOMATICAMENTE.
-- Somente o Supabase pmmsdjozyyxkbuqlkfpb, APÓS AUTORIZAÇÃO EXPLÍCITA,
-- revisão, confirmação de backup e teste no Painel/admin e em ambiente isolado.
-- Não elimina solicitações, respostas nem anexos. Suspende apenas a consulta
-- legada que usa protocolo sem chave e deixa documentos-respostas privado.
-- A tela pública deverá mostrar manutenção até a consulta com chave entrar no ar.
-- IMPORTANTE: não confundir com produção já aplicada. ESSE ARQUIVO NÃO FOI EXECUTADO.
BEGIN;

DO $$
DECLARE
  politica_adm text;
  total_funcoes integer;
BEGIN
  IF current_setting('mandato.contencao_urgente_autorizada', true) IS DISTINCT FROM 'sim'
     OR current_setting('mandato.backup_confirmado', true) IS DISTINCT FROM 'sim'
  THEN
     RAISE EXCEPTION 'Contenção não autorizada: sem autorização explícita ou confirmação de backup';
  END IF;
  -- Evitar executar por acidente contra outro banco com esquema parecido.
  IF current_database() IS NULL OR to_regclass('public.solicitacoes') IS NULL
     OR to_regclass('public.respostas_solicitacoes') IS NULL
     OR to_regclass('storage.buckets') IS NULL OR to_regclass('storage.objects') IS NULL
  THEN
    RAISE EXCEPTION 'Ambiente inconsistente';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id='documentos-respostas')
     OR NOT EXISTS(SELECT 1 FROM pg_class WHERE oid='storage.objects'::regclass AND relrowsecurity)
  THEN
    RAISE EXCEPTION 'Bucket/RLS incompatível; abortar contenção';
  END IF;

  SELECT count(*) INTO total_funcoes
  FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='public' AND p.proname IN (
    'consulta_publica_protocolo','consulta_publica_historico_protocolo',
    'consulta_publica_respostas_protocolo','consultar_protocolo'
  ) AND pg_get_function_identity_arguments(p.oid)='p_protocolo text';
  IF total_funcoes<>4 THEN
    RAISE EXCEPTION 'Número inesperado de funções legadas: %',total_funcoes;
  END IF;

  -- Preservar o acesso do administrador conforme a política ORIGINAL de UPDATE.
  SELECT qual INTO politica_adm
  FROM pg_policies
  WHERE schemaname='storage' AND tablename='objects'
    AND policyname='admin atualiza documentos de resposta' AND cmd='UPDATE'
    AND roles=ARRAY['authenticated']::name[];
  IF politica_adm IS NULL OR position('documentos-respostas' in politica_adm)=0
     OR position('auth.uid()' in politica_adm)=0
  THEN
    RAISE EXCEPTION 'Não foi possível confirmar condição de identidade do administrador';
  END IF;

  IF NOT EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='storage'
    AND tablename='objects' AND policyname='documentos_resposta_leitura_admin')
  THEN
    EXECUTE format('CREATE POLICY documentos_resposta_leitura_admin ON storage.objects
      FOR SELECT TO authenticated USING (bucket_id = %L AND (%s))',
      'documentos-respostas',politica_adm);
  END IF;
  -- Defesa em profundidade: uma política PERMISSIVE futura não pode
  -- reabrir a leitura do bucket para outros usuários autenticados ou anon.
  IF NOT EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='storage'
    AND tablename='objects' AND policyname='documentos_resposta_leitura_restrita')
  THEN
    EXECUTE format('CREATE POLICY documentos_resposta_leitura_restrita ON storage.objects
      AS RESTRICTIVE FOR SELECT TO PUBLIC USING (bucket_id <> %L OR (%s))',
      'documentos-respostas',politica_adm);
  END IF;
END $$;

-- Revogar do grupo PUBLIC é indispensável: remover apenas de anon não basta.
REVOKE EXECUTE ON FUNCTION public.consulta_publica_protocolo(text)
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.consulta_publica_historico_protocolo(text)
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.consulta_publica_respostas_protocolo(text)
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.consultar_protocolo(text)
  FROM PUBLIC, anon, authenticated;

UPDATE storage.buckets SET public=false
WHERE id='documentos-respostas' AND public=true;

DO $$
DECLARE f regprocedure;
BEGIN
  FOREACH f IN ARRAY ARRAY[
    'public.consulta_publica_protocolo(text)'::regprocedure,
    'public.consulta_publica_historico_protocolo(text)'::regprocedure,
    'public.consulta_publica_respostas_protocolo(text)'::regprocedure,
    'public.consultar_protocolo(text)'::regprocedure
  ] LOOP
    IF has_function_privilege('anon',f,'EXECUTE')
      OR has_function_privilege('authenticated',f,'EXECUTE')
    THEN
      RAISE EXCEPTION 'Contenção não bloqueou a função %',f;
    END IF;
  END LOOP;
  IF EXISTS(SELECT 1 FROM storage.buckets WHERE id='documentos-respostas' AND public)
  THEN RAISE EXCEPTION 'Bucket de respostas continua público'; END IF;
END $$;
COMMIT;

-- CONFERÊNCIA POSTERIOR (consulta somente leitura em nova conexão):
-- SELECT p.proname,
--  has_function_privilege('anon',p.oid,'EXECUTE') AS anon_exec,
--  has_function_privilege('authenticated',p.oid,'EXECUTE') AS auth_exec
-- FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
-- WHERE n.nspname='public' AND p.proname IN
-- ('consulta_publica_protocolo','consulta_publica_historico_protocolo',
-- 'consulta_publica_respostas_protocolo','consultar_protocolo');
-- SELECT id,public FROM storage.buckets WHERE id='documentos-respostas';

-- PLANO DE REVERSÃO SE ALGO FALHAR:
-- NÃO reabrir acesso por protocolo; não tornar o bucket público.
-- Corrigir consulta/admin via links assinados e políticas apropriadas.
-- O aplicativo cidadão pode ficar temporariamente sem acompanhamento:
-- aceitar indisponibilidade é mais seguro que expor descrição e anexos.
