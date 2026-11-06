-- EXECUTAR SOMENTE EM BANCO ISOLADO, APOS INSTALAR O RASCUNHO SQL.
-- Verificacoes de seguranca: nao escreve em tabelas de producao.
do $$
declare
  v integer;
begin
  select count(*) into v from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname in
  ('criar_solicitacao_privada','consultar_solicitacao_privada',
   'consultar_respostas_privadas','consultar_historico_privado')
  and p.prosecdef;
  if v<>4 then raise exception 'Esperadas quatro funcoes SECURITY DEFINER, encontradas %',v; end if;

  if has_schema_privilege('anon','mandato_privado','USAGE')
  or has_table_privilege('anon','mandato_privado.chaves','SELECT')
  then raise exception 'Anon possui acesso indevido ao schema privado'; end if;

  if not has_function_privilege('anon',
  'public.consultar_solicitacao_privada(text)','EXECUTE')
  then raise exception 'Anon nao consegue usar a consulta por chave'; end if;

  if exists(select 1 from public.consultar_solicitacao_privada(repeat('0',64)))
  then raise exception 'Chave falsa retornou dados'; end if;

  if exists(select 1 from public.consultar_respostas_privadas(repeat('0',64)))
  then raise exception 'Chave falsa retornou respostas'; end if;

  if exists(select 1 from public.consultar_historico_privado(repeat('0',64)))
  then raise exception 'Chave falsa retornou historico'; end if;

  raise notice 'Verificacoes estruturais concluidas; ainda faltam testes de isolamento com duas solicitacoes reais de homologacao.';
end $$;

-- Verificacoes manuais complementares:
-- 1. Criar solicitacoes A e B com dados ficticios.
-- 2. Consultar A com chave A, B com chave B; tentar cruzar.
-- 3. Revogar chave A e confirmar ausencia de dados/respostas/historico.
-- 4. Conferir que o painel admin nao perdeu acesso.
-- 5. Confirmar que RPCs legadas por protocolo foram revogadas no corte.
-- 6. Testar documentos de resposta e links expirados.
