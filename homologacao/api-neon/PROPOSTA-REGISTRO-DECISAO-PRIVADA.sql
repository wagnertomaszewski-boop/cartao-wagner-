-- PROPOSTA NÃO EXECUTADA: registro de decisão em homologação isolada.
-- Requer autorização específica antes de instalar esta função com gravação.
-- O servidor deve validar sessão Supabase Auth e vínculo UID->OP antes de chamar.
-- O registro de evidência deve resultar de conferência real, não de checkbox.
-- Registros imutáveis: não há UPDATE nem DELETE concedidos à API.
CREATE OR REPLACE FUNCTION mandato_testes.registrar_decisao_identidade_privada(
 p_protocolo text,p_operador text,p_registro_id text,
 p_identidade_verificada boolean,p_evidencia_conferida boolean,
 p_status text
) RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,mandato_testes AS $fn$
DECLARE v_id bigint;
BEGIN
 IF p_protocolo !~ '^[A-Za-z0-9-]{1,40}$'
  OR p_operador !~ '^OP-[A-Za-z0-9-]{4,40}$'
  OR p_registro_id !~ '^[A-Za-z0-9-]{8,80}$'
  OR p_status NOT IN ('aprovado','rejeitado')
  OR p_identidade_verificada IS NULL OR p_evidencia_conferida IS NULL
 THEN RAISE EXCEPTION 'Parâmetros de decisão inválidos'; END IF;
 IF p_status='aprovado' AND
  (p_identidade_verificada IS DISTINCT FROM true OR
   p_evidencia_conferida IS DISTINCT FROM true)
 THEN RAISE EXCEPTION 'Evidência e identidade obrigatórias'; END IF;
 INSERT INTO mandato_testes.decisoes_identidade_homologacao
  (protocolo,operador,registro_id,identidade_verificada,evidencia_conferida,status)
 VALUES (p_protocolo,p_operador,p_registro_id,p_identidade_verificada,p_evidencia_conferida,p_status)
 RETURNING id INTO v_id;
 RETURN v_id;
END $fn$;
REVOKE ALL ON FUNCTION mandato_testes.registrar_decisao_identidade_privada(text,text,text,boolean,boolean,text) FROM PUBLIC;
-- NÃO conceder EXECUTE à API até prova de autorização por sessão vinculada.
