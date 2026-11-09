-- RASCUNHO. Não executar em produção. Requer autorização, backup e API privada pronta.
-- O papel separado recebe somente EXECUTE; acesso HTTP exige autenticação admin/MFA.
BEGIN;
DO $$ BEGIN
 IF current_setting('mandato.migracao_autorizada',true) IS DISTINCT FROM 'sim' THEN
  RAISE EXCEPTION 'Migração não autorizada; nenhum privilégio alterado';
 END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='mandato_api_privada') THEN
  RAISE EXCEPTION 'API privada e papel restrito precisam existir antes da contenção';
 END IF;
END $$;
REVOKE EXECUTE ON FUNCTION public.consulta_publica_protocolo(text) FROM PUBLIC,anon,authenticated;
REVOKE EXECUTE ON FUNCTION public.consulta_publica_historico_protocolo(text) FROM PUBLIC,anon,authenticated;
REVOKE EXECUTE ON FUNCTION public.consulta_publica_respostas_protocolo(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.consulta_publica_protocolo(text),public.consulta_publica_historico_protocolo(text),public.consulta_publica_respostas_protocolo(text) TO mandato_api_privada;
COMMIT;
