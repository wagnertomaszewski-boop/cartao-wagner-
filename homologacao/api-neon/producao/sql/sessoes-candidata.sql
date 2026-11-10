-- PREPARAÇÃO SOMENTE. Executar após estrutura-candidata.sql e autorização final.
-- Não concede leitura da tabela Auth ao backend nem cria RPC pública.
BEGIN;
DO $$ BEGIN
 IF current_setting('mandato.migracao_autorizada',true) IS DISTINCT FROM 'sim' THEN
  RAISE EXCEPTION 'Migração não autorizada';
 END IF;
END $$;
CREATE OR REPLACE FUNCTION mandato_privado.sessao_administrativa_ativa(usuario uuid,sessao uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $$ SELECT EXISTS(SELECT 1 FROM auth.sessions s WHERE s.id=sessao AND s.user_id=usuario
 AND (s.not_after IS NULL OR s.not_after>now())) $$;
REVOKE ALL ON FUNCTION mandato_privado.sessao_administrativa_ativa(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION mandato_privado.sessao_administrativa_ativa(uuid,uuid) TO mandato_api_privada;
COMMIT;
