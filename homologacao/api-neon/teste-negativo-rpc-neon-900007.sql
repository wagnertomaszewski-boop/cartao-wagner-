-- Teste negativo executado no Neon isolado; não cria dados persistentes.
-- Qualquer aceitação indevida faz o bloco falhar.
DO $check$ DECLARE v_erro text; BEGIN
 BEGIN
  PERFORM mandato_testes.registrar_decisao_sintetica_900007('LEGADO-EMISSAO-TESTE-900007','OP-TESTE-900007','REG-TESTE-900007');
  RAISE EXCEPTION 'FALHA_SEGURANCA: evidência consumida foi aceita';
 EXCEPTION WHEN OTHERS THEN
  GET STACKED DIAGNOSTICS v_erro=MESSAGE_TEXT;
  IF v_erro LIKE 'FALHA_SEGURANCA:%' THEN RAISE; END IF;
  IF v_erro NOT LIKE 'Evidência independente ausente ou já consumida%' THEN RAISE EXCEPTION 'Erro inesperado: %',v_erro; END IF;
 END;
 BEGIN
  PERFORM mandato_testes.registrar_decisao_sintetica_900007('PROTOCOLO-INVALIDO','OP-TESTE-900007','REG-TESTE-900007');
  RAISE EXCEPTION 'FALHA_SEGURANCA: protocolo inválido foi aceito';
 EXCEPTION WHEN OTHERS THEN
  GET STACKED DIAGNOSTICS v_erro=MESSAGE_TEXT;
  IF v_erro LIKE 'FALHA_SEGURANCA:%' THEN RAISE; END IF;
  IF v_erro NOT LIKE 'Fora do escopo sintético%' THEN RAISE EXCEPTION 'Erro inesperado: %',v_erro; END IF;
 END;
END $check$;
