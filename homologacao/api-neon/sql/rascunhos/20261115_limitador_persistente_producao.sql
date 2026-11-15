-- RASCUNHO: NÃO EXECUTAR EM PRODUÇÃO SEM RESTAURAÇÃO TESTADA.
-- Limite compartilhado entre instâncias, incrementado atomicamente.
-- Identificador: HMAC servidor de IP normalizado + protocolo; jamais IP bruto.
-- Requer schema mandato_privado da migração anterior.
BEGIN;
CREATE TABLE IF NOT EXISTS mandato_privado.tentativas_consulta (
 identificador bytea NOT NULL CHECK (octet_length(identificador)=32),
 janela_inicio timestamptz NOT NULL,
 quantidade integer NOT NULL CHECK (quantidade >= 1),
 atualizado_em timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY (identificador, janela_inicio)
);
CREATE INDEX IF NOT EXISTS tentativas_consulta_atualizado_idx ON mandato_privado.tentativas_consulta(atualizado_em);
ALTER TABLE mandato_privado.tentativas_consulta ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON mandato_privado.tentativas_consulta FROM PUBLIC, anon, authenticated;
-- Conceder EXECUTE apenas ao papel técnico de backend após revisão de privilégios.
-- Não expor esta função a anon/authenticated/PostgREST.
CREATE OR REPLACE FUNCTION mandato_privado.registrar_tentativa_consulta(
 p_identificador bytea,
 p_limite integer DEFAULT 5,
 p_janela_segundos integer DEFAULT 60
) RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
 v_agora timestamptz := clock_timestamp();
 v_inicio timestamptz;
 v_quantidade integer;
BEGIN
 IF p_identificador IS NULL OR octet_length(p_identificador) <> 32
    OR p_limite < 1 OR p_limite > 100
    OR p_janela_segundos < 10 OR p_janela_segundos > 3600
 THEN RETURN false; END IF;
 v_inicio := to_timestamp(floor(extract(epoch FROM v_agora) / p_janela_segundos) * p_janela_segundos);
 INSERT INTO mandato_privado.tentativas_consulta(identificador, janela_inicio, quantidade, atualizado_em)
 VALUES(p_identificador,v_inicio,1,v_agora)
 ON CONFLICT (identificador,janela_inicio)
 DO UPDATE SET quantidade = mandato_privado.tentativas_consulta.quantidade + 1,
               atualizado_em = EXCLUDED.atualizado_em
 RETURNING quantidade INTO v_quantidade;
 RETURN v_quantidade <= p_limite;
END;
$$;
REVOKE ALL ON FUNCTION mandato_privado.registrar_tentativa_consulta(bytea,integer,integer) FROM PUBLIC, anon, authenticated;
-- Limpeza controlada, separada: DELETE WHERE atualizado_em < now() - interval '2 days'
-- Verificar pg_cron/rotina operacional antes de automatizar.
COMMIT;
