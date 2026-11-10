-- CANDIDATA: não executada em produção. Pré-requisitos: backup/restauração e aprovação.
BEGIN;
DO $$ BEGIN
 IF current_setting('mandato.migracao_autorizada',true) IS DISTINCT FROM 'sim' THEN RAISE EXCEPTION 'Migração não autorizada'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='mandato_api_privada' AND NOT rolbypassrls AND NOT rolsuper) THEN RAISE EXCEPTION 'Papel privado restrito ausente'; END IF;
END $$;
CREATE SCHEMA IF NOT EXISTS mandato_privado;
REVOKE ALL ON SCHEMA mandato_privado FROM PUBLIC,anon,authenticated;
GRANT USAGE ON SCHEMA mandato_privado TO mandato_api_privada;
CREATE TABLE IF NOT EXISTS mandato_privado.chaves_acompanhamento(
 solicitacao_id bigint PRIMARY KEY REFERENCES public.solicitacoes(id) ON DELETE RESTRICT,
 chave_hash bytea NOT NULL CHECK(octet_length(chave_hash)=32),
 emitida_em timestamptz NOT NULL DEFAULT now(),emitida_por uuid NOT NULL,revogada_em timestamptz);
CREATE TABLE IF NOT EXISTS mandato_privado.operacoes(
 id bytea PRIMARY KEY CHECK(octet_length(id)=32),solicitacao_id bigint UNIQUE NOT NULL REFERENCES public.solicitacoes(id),dados_hash bytea NOT NULL CHECK(octet_length(dados_hash)=32));
CREATE TABLE IF NOT EXISTS mandato_privado.arquivos(
 id uuid PRIMARY KEY,solicitacao_id bigint NOT NULL REFERENCES public.solicitacoes(id),nome text NOT NULL,mime text NOT NULL,caminho text UNIQUE NOT NULL,sha256 text NOT NULL,criado_em timestamptz NOT NULL DEFAULT now(),UNIQUE(solicitacao_id,sha256));
CREATE TABLE IF NOT EXISTS mandato_privado.recuperacoes(
 id uuid PRIMARY KEY,solicitacao_id bigint NOT NULL REFERENCES public.solicitacoes(id),recibo_hash bytea NOT NULL CHECK(octet_length(recibo_hash)=32),estado text NOT NULL CHECK(estado IN ('pendente','aprovado','rejeitado','emitido','usado','expirado','bloqueado','revogado')),
 justificativa text,aprovador uuid,emitido_por uuid,codigo_hash bytea CHECK(codigo_hash IS NULL OR octet_length(codigo_hash)=32),sal text,expira_em timestamptz,tentativas integer NOT NULL DEFAULT 0 CHECK(tentativas BETWEEN 0 AND 5),criado_em timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS mandato_privado.auditoria(
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,evento text NOT NULL,solicitacao_id bigint REFERENCES public.solicitacoes(id),operador_id uuid,recuperacao_id uuid REFERENCES mandato_privado.recuperacoes(id),criado_em timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS mandato_privado.limites(chave bytea PRIMARY KEY,quantidade integer NOT NULL,inicio timestamptz NOT NULL);
ALTER TABLE public.solicitacoes ADD COLUMN IF NOT EXISTS localizacao_origem text CHECK(localizacao_origem IN ('gps','mapa'));
ALTER TABLE public.solicitacoes ADD COLUMN IF NOT EXISTS precisao_metros double precision CHECK(precisao_metros>=0);
ALTER TABLE public.solicitacoes ADD COLUMN IF NOT EXISTS localizacao_autorizada_em timestamptz;
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['chaves_acompanhamento','operacoes','arquivos','recuperacoes','auditoria','limites'] LOOP
  EXECUTE format('REVOKE ALL ON TABLE mandato_privado.%I FROM PUBLIC,anon,authenticated',t);
  EXECUTE format('ALTER TABLE mandato_privado.%I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('ALTER TABLE mandato_privado.%I FORCE ROW LEVEL SECURITY',t);
  EXECUTE format('CREATE POLICY backend_restrito ON mandato_privado.%I TO mandato_api_privada USING(true) WITH CHECK(true)',t);
 END LOOP;
END $$;
GRANT SELECT,INSERT,UPDATE ON mandato_privado.chaves_acompanhamento,mandato_privado.recuperacoes,mandato_privado.limites TO mandato_api_privada;
GRANT SELECT,INSERT ON mandato_privado.operacoes,mandato_privado.arquivos TO mandato_api_privada;
GRANT INSERT ON mandato_privado.auditoria TO mandato_api_privada;
GRANT USAGE ON SEQUENCE mandato_privado.auditoria_id_seq TO mandato_api_privada;
GRANT SELECT,INSERT ON public.solicitacoes TO mandato_api_privada;
GRANT UPDATE(anexos) ON public.solicitacoes TO mandato_api_privada;
GRANT SELECT ON public.solicitacoes_status_historico,public.respostas_solicitacoes TO mandato_api_privada;
GRANT USAGE ON SEQUENCE public.protocolo_seq TO mandato_api_privada;
-- Identity de public.solicitacoes também precisa de USAGE, se configurada.
DO $$ DECLARE seq text;BEGIN seq:=pg_get_serial_sequence('public.solicitacoes','id');IF seq IS NOT NULL THEN EXECUTE format('GRANT USAGE ON SEQUENCE %s TO mandato_api_privada',seq);END IF;END $$;
CREATE POLICY backend_privado_le ON public.solicitacoes FOR SELECT TO mandato_api_privada USING(true);
CREATE POLICY backend_privado_insere ON public.solicitacoes FOR INSERT TO mandato_api_privada WITH CHECK(true);
CREATE POLICY backend_privado_anexos ON public.solicitacoes FOR UPDATE TO mandato_api_privada USING(true) WITH CHECK(true);
CREATE POLICY backend_privado_historico ON public.solicitacoes_status_historico FOR SELECT TO mandato_api_privada USING(true);
CREATE POLICY backend_privado_respostas ON public.respostas_solicitacoes FOR SELECT TO mandato_api_privada USING(true);
-- Não altera protocolos/status antigos, políticas administrativas, históricos ou arquivos.
COMMIT;
