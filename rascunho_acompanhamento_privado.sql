-- RASCUNHO PARA TESTES ISOLADOS. NAO EXECUTAR EM PRODUCAO.
-- Pressupoe tabelas public.solicitacoes, respostas_solicitacoes e solicitacoes_status_historico.
create schema if not exists mandato_privado;
revoke all on schema mandato_privado from public, anon, authenticated;

create table if not exists mandato_privado.chaves (
  solicitacao_id bigint primary key references public.solicitacoes(id) on delete cascade,
  token_hash text not null unique,
  revogado_em timestamptz
);
revoke all on mandato_privado.chaves from public, anon, authenticated;

create or replace function public.criar_solicitacao_privada(
 p_nome text, p_whatsapp text, p_localidade text, p_assunto text,
 p_descricao text, p_anexos text[] default '{}'::text[],
 p_latitude numeric default null, p_longitude numeric default null
) returns table(protocolo text, chave text)
language plpgsql security definer set search_path=''
as $body$
declare v_id bigint; v_protocolo text; v_token text;
begin
 if length(trim(coalesce(p_nome,''))) not between 2 and 150
 or length(trim(coalesce(p_assunto,''))) not between 3 and 200
 or length(trim(coalesce(p_descricao,''))) not between 5 and 10000
 or length(coalesce(p_whatsapp,'')) > 30
 or length(coalesce(p_localidade,'')) > 250
 or coalesce(array_length(p_anexos,1),0) > 5
 or (p_latitude is not null and (p_latitude < -90 or p_latitude > 90))
 or (p_longitude is not null and (p_longitude < -180 or p_longitude > 180))
 then raise exception 'Dados da solicitacao invalidos';
 end if;
 insert into public.solicitacoes(nome,whatsapp,localidade,assunto,descricao,anexos,latitude,longitude)
 values(trim(p_nome),p_whatsapp,p_localidade,trim(p_assunto),trim(p_descricao),p_anexos,p_latitude,p_longitude)
 returning public.solicitacoes.id, public.solicitacoes.protocolo into v_id,v_protocolo;
 v_token:=encode(extensions.gen_random_bytes(32),'hex');
 insert into mandato_privado.chaves(solicitacao_id,token_hash)
 values(v_id,encode(sha256(decode(v_token,'hex')),'hex'));
 return query select v_protocolo,v_token;
end
$body$;

create or replace function public.consultar_solicitacao_privada(p_chave text)
returns table(protocolo text, assunto text, descricao text, localidade text, status text)
language sql security definer set search_path=''
as $body$
 select s.protocolo,s.assunto,s.descricao,s.localidade,s.status
 from mandato_privado.chaves c
 join public.solicitacoes s on s.id=c.solicitacao_id
 where c.revogado_em is null
 and c.token_hash = case
   when p_chave ~ '^[0-9a-f]{64}
 limit 1
$body$;

create or replace function public.consultar_respostas_privadas(p_chave text)
returns table(id bigint, mensagem text, criado_em timestamptz, total_anexos integer)
language sql security definer set search_path=''
as $body$
 select r.id,r.mensagem,r.criado_em,
 case when jsonb_typeof(r.anexos)='array' then jsonb_array_length(r.anexos) else 0 end
 from mandato_privado.chaves c
 join public.respostas_solicitacoes r on r.solicitacao_id=c.solicitacao_id
 where c.revogado_em is null
 and p_chave ~ '^[0-9a-f]{64}$'
 and c.token_hash=encode(sha256(decode(p_chave,'hex')),'hex')
 order by r.criado_em desc
$body$;

create or replace function public.consultar_historico_privado(p_chave text)
returns table(status text, criado_em timestamptz)
language sql security definer set search_path=''
as $body$
 select h.status,h.criado_em
 from mandato_privado.chaves c
 join public.solicitacoes_status_historico h on h.solicitacao_id=c.solicitacao_id
 where c.revogado_em is null
 and p_chave ~ '^[0-9a-f]{64}$'
 and c.token_hash=encode(sha256(decode(p_chave,'hex')),'hex')
 order by h.criado_em asc
$body$;

revoke all on function public.criar_solicitacao_privada(text,text,text,text,text,text[],numeric,numeric) from public, anon, authenticated;
revoke all on function public.consultar_solicitacao_privada(text) from public, anon, authenticated;
revoke all on function public.consultar_respostas_privadas(text) from public, anon, authenticated;
revoke all on function public.consultar_historico_privado(text) from public, anon, authenticated;
grant execute on function public.criar_solicitacao_privada(text,text,text,text,text,text[],numeric,numeric) to anon;
grant execute on function public.consultar_solicitacao_privada(text) to anon;
grant execute on function public.consultar_respostas_privadas(text) to anon;
grant execute on function public.consultar_historico_privado(text) to anon;

-- PENDENTE: testar em banco isolado; acesso a anexos; rate limiting;
-- corte das quatro consultas antigas por protocolo; testes de revogacao.
 then encode(sha256(decode(p_chave,'hex')),'hex')
   else null
 end
 limit 1
$body$;

create or replace function public.consultar_respostas_privadas(p_chave text)
returns table(mensagem text, criado_em timestamptz)
language sql security definer set search_path=''
as $body$
 select r.mensagem,r.criado_em
 from mandato_privado.chaves c
 join public.respostas_solicitacoes r on r.solicitacao_id=c.solicitacao_id
 where c.revogado_em is null
 and c.token_hash = case
   when p_chave ~ '^[0-9a-f]{64}
 order by r.criado_em desc
$body$;

create or replace function public.consultar_historico_privado(p_chave text)
returns table(status text, criado_em timestamptz)
language sql security definer set search_path=''
as $body$
 select h.status,h.criado_em
 from mandato_privado.chaves c
 join public.solicitacoes_status_historico h on h.solicitacao_id=c.solicitacao_id
 where c.revogado_em is null
 and p_chave ~ '^[0-9a-f]{64}$'
 and c.token_hash=encode(sha256(decode(p_chave,'hex')),'hex')
 order by h.criado_em asc
$body$;

revoke all on function public.criar_solicitacao_privada(text,text,text,text,text,text[],numeric,numeric) from public, anon, authenticated;
revoke all on function public.consultar_solicitacao_privada(text) from public, anon, authenticated;
revoke all on function public.consultar_respostas_privadas(text) from public, anon, authenticated;
revoke all on function public.consultar_historico_privado(text) from public, anon, authenticated;
grant execute on function public.criar_solicitacao_privada(text,text,text,text,text,text[],numeric,numeric) to anon;
grant execute on function public.consultar_solicitacao_privada(text) to anon;
grant execute on function public.consultar_respostas_privadas(text) to anon;
grant execute on function public.consultar_historico_privado(text) to anon;

-- PENDENTE: testar em banco isolado; acesso a anexos; rate limiting;
-- corte das quatro consultas antigas por protocolo; testes de revogacao.
 then encode(sha256(decode(p_chave,'hex')),'hex')
   else null
 end
 order by r.criado_em desc
$body$;

create or replace function public.consultar_historico_privado(p_chave text)
returns table(status text, criado_em timestamptz)
language sql security definer set search_path=''
as $body$
 select h.status,h.criado_em
 from mandato_privado.chaves c
 join public.solicitacoes_status_historico h on h.solicitacao_id=c.solicitacao_id
 where c.revogado_em is null
 and c.token_hash = case
   when p_chave ~ '^[0-9a-f]{64}
 order by h.criado_em asc
$body$;

revoke all on function public.criar_solicitacao_privada(text,text,text,text,text,text[],numeric,numeric) from public, anon, authenticated;
revoke all on function public.consultar_solicitacao_privada(text) from public, anon, authenticated;
revoke all on function public.consultar_respostas_privadas(text) from public, anon, authenticated;
revoke all on function public.consultar_historico_privado(text) from public, anon, authenticated;
grant execute on function public.criar_solicitacao_privada(text,text,text,text,text,text[],numeric,numeric) to anon;
grant execute on function public.consultar_solicitacao_privada(text) to anon;
grant execute on function public.consultar_respostas_privadas(text) to anon;
grant execute on function public.consultar_historico_privado(text) to anon;

-- PENDENTE: testar em banco isolado; acesso a anexos; rate limiting;
-- corte das quatro consultas antigas por protocolo; testes de revogacao.
 then encode(sha256(decode(p_chave,'hex')),'hex')
   else null
 end
 order by h.criado_em asc
$body$;

revoke all on function public.criar_solicitacao_privada(text,text,text,text,text,text[],numeric,numeric) from public, anon, authenticated;
revoke all on function public.consultar_solicitacao_privada(text) from public, anon, authenticated;
revoke all on function public.consultar_respostas_privadas(text) from public, anon, authenticated;
revoke all on function public.consultar_historico_privado(text) from public, anon, authenticated;
grant execute on function public.criar_solicitacao_privada(text,text,text,text,text,text[],numeric,numeric) to anon;
grant execute on function public.consultar_solicitacao_privada(text) to anon;
grant execute on function public.consultar_respostas_privadas(text) to anon;
grant execute on function public.consultar_historico_privado(text) to anon;

-- PENDENTE: testar em banco isolado; acesso a anexos; rate limiting;
-- corte das quatro consultas antigas por protocolo; testes de revogacao.
