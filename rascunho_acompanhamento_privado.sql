-- PROPOSTA DE MIGRACAO PARA HOMOLOGACAO; NAO EXECUTAR EM PRODUCAO
create schema if not exists mandato_privado;
revoke all on schema mandato_privado from public, anon, authenticated;

create table mandato_privado.chaves (
  solicitacao_id bigint primary key references public.solicitacoes(id) on delete cascade,
  token_hash text not null unique,
  revogado_em timestamptz
);
revoke all on mandato_privado.chaves from public, anon, authenticated;

create function public.criar_solicitacao_privada(
 p_nome text, p_whatsapp text, p_localidade text, p_assunto text,
 p_descricao text, p_anexos text[] default '{}'
) returns table (protocolo text, chave text)
language plpgsql security definer set search_path=''
as $$
declare v_id bigint; v_protocolo text; v_token text;
begin
 insert into public.solicitacoes(nome,whatsapp,localidade,assunto,descricao,anexos)
 values(p_nome,p_whatsapp,p_localidade,p_assunto,p_descricao,p_anexos)
 returning id, solicitacoes.protocolo into v_id,v_protocolo;
 v_token:=encode(gen_random_bytes(32),'hex');
 insert into mandato_privado.chaves(solicitacao_id,token_hash)
 values(v_id,encode(sha256(decode(v_token,'hex')),'hex'));
 return query select v_protocolo,v_token;
end $$;

create function public.consultar_solicitacao_privada(p_chave text)
returns table(protocolo text, assunto text, descricao text, localidade text, status text)
language sql security definer set search_path=''
as $$
 select s.protocolo,s.assunto,s.descricao,s.localidade,s.status
 from mandato_privado.chaves c
 join public.solicitacoes s on s.id=c.solicitacao_id
 where c.revogado_em is null
 and p_chave ~ '^[0-9a-f]{64}$'
 and c.token_hash=encode(sha256(decode(p_chave,'hex')),'hex')
 limit 1
$$;

create function public.consultar_respostas_privadas(p_chave text)
returns table(mensagem text, criado_em timestamptz)
language sql security definer set search_path=''
as $$
 select r.mensagem,r.criado_em
 from mandato_privado.chaves c
 join public.respostas_solicitacoes r on r.solicitacao_id=c.solicitacao_id
 where c.revogado_em is null
 and p_chave ~ '^[0-9a-f]{64}$'
 and c.token_hash=encode(sha256(decode(p_chave,'hex')),'hex')
 order by r.criado_em desc
$$;

create function public.consultar_historico_privado(p_chave text)
returns table(status text, criado_em timestamptz)
language sql security definer set search_path=''
as $
 select h.status,h.criado_em
 from mandato_privado.chaves c
 join public.solicitacoes_status_historico h on h.solicitacao_id=c.solicitacao_id
 where c.revogado_em is null
 and p_chave ~ '^[0-9a-f]{64}(text,text,text,text,text,text[]) from public;
revoke all on function public.consultar_solicitacao_privada(text) from public;
revoke all on function public.consultar_respostas_privadas(text) from public;
grant execute on function public.criar_solicitacao_privada(text,text,text,text,text,text[]) to anon;
grant execute on function public.consultar_solicitacao_privada(text) to anon;
grant execute on function public.consultar_respostas_privadas(text) to anon;

-- TODO antes de liberar: validacao de entrada, rate limiting,
-- anexos privados, auditoria, revogacao de funcoes antigas e testes.

 and c.token_hash=encode(sha256(decode(p_chave,'hex')),'hex')
 order by h.criado_em asc
$;

revoke all on function public.consultar_historico_privado(text) from public;
grant execute on function public.consultar_historico_privado(text) to anon;

revoke all on function public.criar_solicitacao_privada(text,text,text,text,text,text[]) from public;
revoke all on function public.consultar_solicitacao_privada(text) from public;
revoke all on function public.consultar_respostas_privadas(text) from public;
grant execute on function public.criar_solicitacao_privada(text,text,text,text,text,text[]) to anon;
grant execute on function public.consultar_solicitacao_privada(text) to anon;
grant execute on function public.consultar_respostas_privadas(text) to anon;

-- TODO antes de liberar: validacao de entrada, rate limiting,
-- anexos privados, auditoria, revogacao de funcoes antigas e testes.
