-- NÃO EXECUTAR antes do aceite, backup, backend e autorização final.
BEGIN;
DO $$ DECLARE v text; BEGIN
 IF current_setting('mandato.migracao_autorizada',true) IS DISTINCT FROM 'sim'
 OR current_setting('mandato.backend_privado_validado',true) IS DISTINCT FROM 'sim'
 THEN RAISE EXCEPTION 'Contenção não autorizada ou backend não validado'; END IF;
 -- Nova consulta precisa estar presente; não trocar leitura por indisponibilidade silenciosa.
 IF to_regclass('mandato_privado.chaves_acompanhamento') IS NULL THEN RAISE EXCEPTION 'Estrutura privada ausente'; END IF;
 -- Reutiliza exatamente a restrição administrativa já existente nos documentos.
 SELECT qual INTO v FROM pg_policies WHERE schemaname='storage' AND tablename='objects'
 AND policyname='admin atualiza documentos de resposta' AND roles=ARRAY['authenticated']::name[];
 IF v IS NULL THEN RAISE EXCEPTION 'Política administrativa original não conferida'; END IF;
 EXECUTE format('CREATE POLICY documentos_resposta_leitura_admin ON storage.objects FOR SELECT TO authenticated USING (%s)',v);
END $$;
REVOKE EXECUTE ON FUNCTION public.consulta_publica_protocolo(text) FROM PUBLIC,anon,authenticated;
REVOKE EXECUTE ON FUNCTION public.consulta_publica_historico_protocolo(text) FROM PUBLIC,anon,authenticated;
REVOKE EXECUTE ON FUNCTION public.consulta_publica_respostas_protocolo(text) FROM PUBLIC,anon,authenticated;
UPDATE storage.buckets SET public=false WHERE id='documentos-respostas';
-- Não altera o bucket de conteúdo público nem permissões do Painel sobre solicitações.
DO $$ DECLARE f regprocedure; BEGIN
 FOREACH f IN ARRAY ARRAY['public.consulta_publica_protocolo(text)'::regprocedure,'public.consulta_publica_historico_protocolo(text)'::regprocedure,'public.consulta_publica_respostas_protocolo(text)'::regprocedure] LOOP
  IF has_function_privilege('anon',f,'EXECUTE') OR has_function_privilege('authenticated',f,'EXECUTE') THEN RAISE EXCEPTION 'Contorno de execução ainda presente';END IF;
 END LOOP;
END $$;
COMMIT;
-- Reversão: manter estas revogações e bucket privado. Voltar somente clientes privados
-- compatíveis ou colocar acompanhamento em manutenção. Nunca reabrir protocolo isolado.
