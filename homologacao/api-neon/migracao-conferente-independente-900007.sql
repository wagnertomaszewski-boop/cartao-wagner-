-- PROPOSTA NÃO EXECUTADA. Exclusiva para Neon de homologação, registro sintético 900007.
-- Aplicar somente após revisão, backup e autorização específica. Não executar em produção.
-- Não cria atestados nem modifica evidências existentes.
BEGIN;
CREATE OR REPLACE FUNCTION mandato_testes.registrar_decisao_sintetica_900007(
 p_protocolo text,p_operador text,p_registro_id text
) RETURNS bigint
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO pg_catalog, mandato_testes
AS $function$
DECLARE v_id bigint;
BEGIN
 IF p_protocolo IS DISTINCT FROM 'LEGADO-EMISSAO-TESTE-900007'
    OR p_operador IS DISTINCT FROM 'OP-TESTE-900007'
    OR p_registro_id IS DISTINCT FROM 'REG-TESTE-900007'
 THEN RAISE EXCEPTION 'Fora do escopo sintético'; END IF;
 UPDATE mandato_testes.evidencias_identidade_sinteticas_900007
 SET consumida_em=now()
 WHERE registro_id=p_registro_id AND protocolo=p_protocolo
   AND operador=p_operador
   AND conferente='REV-CONFERENTE-EXTERNO'
   AND conferente IS DISTINCT FROM 'REV-'||substring(p_operador from 4)
   AND confirmada IS TRUE AND consumida_em IS NULL
 RETURNING 1 INTO v_id;
 IF v_id IS NULL THEN RAISE EXCEPTION 'Evidência independente ausente ou já consumida'; END IF;
 INSERT INTO mandato_testes.decisoes_identidade_homologacao
 (protocolo,operador,registro_id,identidade_verificada,evidencia_conferida,status)
 VALUES(p_protocolo,p_operador,p_registro_id,true,true,'aprovado')
 RETURNING id INTO v_id;
 RETURN v_id;
END;
$function$;
-- CREATE OR REPLACE preserva ACLs da função existente. Revisar EXECUTE separadamente.
COMMIT;
-- Rollback: restaurar definição anterior versionada e repetir auditoria de privilégios.
