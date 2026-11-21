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
 segredo_verificador bytea NOT NULL CHECK(octet_length(segredo_verificador)=32),
 segredo_versao integer NOT NULL DEFAULT 1 CHECK(segredo_versao>0),
 criada_em timestamptz NOT NULL DEFAULT now(),renovada_em timestamptz,revogada_em timestamptz);
CREATE TABLE IF NOT EXISTS mandato_privado.operacoes(
 id bytea PRIMARY KEY CHECK(octet_length(id)=32),solicitacao_id bigint UNIQUE NOT NULL REFERENCES public.solicitacoes(id),dados_hash bytea NOT NULL CHECK(octet_length(dados_hash)=32));
CREATE TABLE IF NOT EXISTS mandato_privado.arquivos(
 id uuid PRIMARY KEY,solicitacao_id bigint NOT NULL REFERENCES public.solicitacoes(id),nome text NOT NULL,mime text NOT NULL,caminho text UNIQUE NOT NULL,sha256 text NOT NULL,criado_em timestamptz NOT NULL DEFAULT now(),UNIQUE(solicitacao_id,sha256));
-- Reutiliza as tabelas do esquema privado existente. Pedidos anteriores sem recibo
-- não são elegíveis no fluxo novo. Nenhum código ou pedido é apagado.
ALTER TABLE mandato_privado.pedidos_recuperacao
 ADD COLUMN IF NOT EXISTS recibo_hash bytea CHECK (octet_length(recibo_hash)=32);
CREATE TABLE IF NOT EXISTS mandato_privado.limites(chave bytea PRIMARY KEY,quantidade integer NOT NULL,inicio timestamptz NOT NULL);
ALTER TABLE public.solicitacoes ADD COLUMN IF NOT EXISTS localizacao_origem text CHECK(localizacao_origem IN ('gps','mapa'));
ALTER TABLE public.solicitacoes ADD COLUMN IF NOT EXISTS precisao_metros double precision CHECK(precisao_metros>=0);
ALTER TABLE public.solicitacoes ADD COLUMN IF NOT EXISTS localizacao_autorizada_em timestamptz;
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['chaves_acompanhamento','operacoes','arquivos','pedidos_recuperacao','codigos_recuperacao','auditoria_recuperacao','limites'] LOOP
  EXECUTE format('REVOKE ALL ON TABLE mandato_privado.%I FROM PUBLIC,anon,authenticated',t);
  EXECUTE format('ALTER TABLE mandato_privado.%I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('ALTER TABLE mandato_privado.%I FORCE ROW LEVEL SECURITY',t);
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='mandato_privado' AND tablename=t AND policyname='backend_restrito') THEN
   EXECUTE format('CREATE POLICY backend_restrito ON mandato_privado.%I TO mandato_api_privada USING(true) WITH CHECK(true)',t);
  ELSIF NOT EXISTS (
   SELECT 1 FROM pg_policies WHERE schemaname='mandato_privado' AND tablename=t
   AND policyname='backend_restrito' AND permissive='PERMISSIVE' AND cmd='ALL'
   AND roles=ARRAY['mandato_api_privada']::name[] AND qual='true' AND with_check='true'
  ) THEN
   RAISE EXCEPTION 'Política privada preexistente incompatível em %. Não sobrescrever.',t;
  END IF;
 END LOOP;
END $$;
GRANT SELECT,INSERT,UPDATE ON mandato_privado.chaves_acompanhamento,mandato_privado.pedidos_recuperacao,mandato_privado.codigos_recuperacao,mandato_privado.limites TO mandato_api_privada;
GRANT SELECT,INSERT ON mandato_privado.operacoes,mandato_privado.arquivos TO mandato_api_privada;
GRANT INSERT ON mandato_privado.auditoria_recuperacao TO mandato_api_privada;
GRANT USAGE ON SEQUENCE mandato_privado.auditoria_recuperacao_id_seq TO mandato_api_privada;
GRANT SELECT,INSERT ON public.solicitacoes TO mandato_api_privada;
GRANT UPDATE(anexos) ON public.solicitacoes TO mandato_api_privada;
GRANT SELECT ON public.solicitacoes_status_historico,public.respostas_solicitacoes TO mandato_api_privada;
GRANT USAGE ON SEQUENCE public.protocolo_seq TO mandato_api_privada;
-- Identity de public.solicitacoes também precisa de USAGE, se configurada.
DO $$ DECLARE seq text;BEGIN seq:=pg_get_serial_sequence('public.solicitacoes','id');IF seq IS NOT NULL THEN EXECUTE format('GRANT USAGE ON SEQUENCE %s TO mandato_api_privada',seq);END IF;END $$;
-- Evita interrupção na reaplicação e impede aceitar política homônima mais permissiva.
DO $$
DECLARE p record;BEGIN
 FOR p IN
  SELECT * FROM (VALUES
   ('solicitacoes','backend_privado_le','SELECT','true',NULL::text),
   ('solicitacoes','backend_privado_insere','INSERT',NULL::text,'true'),
   ('solicitacoes','backend_privado_anexos','UPDATE','true','true'),
   ('solicitacoes_status_historico','backend_privado_historico','SELECT','true',NULL::text),
   ('respostas_solicitacoes','backend_privado_respostas','SELECT','true',NULL::text)
  ) AS v(tabela,politica,comando,condicao,verificacao)
 LOOP
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename=p.tabela AND policyname=p.politica) THEN
   EXECUTE format(
    'CREATE POLICY %I ON public.%I FOR %s TO mandato_api_privada %s %s',
    p.politica,p.tabela,p.comando,
    CASE WHEN p.condicao IS NULL THEN '' ELSE 'USING(true)' END,
    CASE WHEN p.verificacao IS NULL THEN '' ELSE 'WITH CHECK(true)' END
   );
  ELSIF NOT EXISTS (
   SELECT 1 FROM pg_policies WHERE schemaname='public'
    AND tablename=p.tabela AND policyname=p.politica
    AND permissive='PERMISSIVE' AND cmd=p.comando
    AND roles=ARRAY['mandato_api_privada']::name[]
    AND qual IS NOT DISTINCT FROM p.condicao
    AND with_check IS NOT DISTINCT FROM p.verificacao
  ) THEN
   RAISE EXCEPTION 'Política pública preexistente incompatível: %.%. Não sobrescrever.',p.tabela,p.politica;
  END IF;
 END LOOP;
END $$;
-- Não altera protocolos/status antigos, políticas administrativas, históricos ou arquivos.
COMMIT;
