-- SOMENTE HOMOLOGACAO ISOLADA. Nao executar em producao sem testes.
-- Confere a chave e associa o indice do documento a uma resposta da solicitacao.
create or replace function public.localizar_documento_privado(
 p_chave text, p_resposta_id bigint, p_indice integer
) returns table(caminho text, nome text)
language sql security definer set search_path=''
as $body$
 select a.item->>'caminho', coalesce(nullif(a.item->>'nome',''),'Documento')
 from mandato_privado.chaves c
 join public.respostas_solicitacoes r on r.solicitacao_id=c.solicitacao_id
 cross join lateral jsonb_array_elements(
   case when jsonb_typeof(r.anexos)='array' then r.anexos else '[]'::jsonb end
 ) with ordinality as a(item,ordem)
 where c.revogado_em is null
 and c.token_hash = case
   when p_chave ~ '^[0-9a-f]{64}$' then encode(sha256(decode(p_chave,'hex')),'hex')
   else null end
 and r.id=p_resposta_id
 and p_indice between 0 and 19
 and a.ordem=p_indice+1
 and jsonb_typeof(a.item)='object'
 and a.item ? 'caminho'
 and length(a.item->>'caminho') between 1 and 500
 and a.item->>'caminho' !~ '(^/|\\.\\.|\\\\)'
 limit 1
$body$;
revoke all on function public.localizar_documento_privado(text,bigint,integer) from public,anon,authenticated;
grant execute on function public.localizar_documento_privado(text,bigint,integer) to service_role;
-- Esta RPC sera usada SOMENTE pelo servidor com service_role.
-- Nunca conceder EXECUTE a anon.
