-- Avaliacao de atendimento por convite privado e uso unico.
-- A consulta de protocolos publicos nao revela o convite.
create table if not exists public.avaliacoes_solicitacoes (
  solicitacao_id bigint primary key references public.solicitacoes(id) on delete cascade,
  convite uuid not null unique default gen_random_uuid(),
  avaliacao text null check (avaliacao in ('sim', 'parcialmente', 'nao')),
  criado_em timestamptz not null default now(),
  respondido_em timestamptz null,
  constraint avaliacao_resposta_coerente check (
    (avaliacao is null and respondido_em is null) or
    (avaliacao is not null and respondido_em is not null)
  )
);

alter table public.avaliacoes_solicitacoes enable row level security;
revoke all on public.avaliacoes_solicitacoes from anon, authenticated;
grant select, insert on public.avaliacoes_solicitacoes to authenticated;

drop policy if exists "Somente administrador consulta avaliacoes" on public.avaliacoes_solicitacoes;
create policy "Somente administrador consulta avaliacoes"
  on public.avaliacoes_solicitacoes
  for select to authenticated
  using ((select auth.uid()) = 'ca5c30ec-828e-4c95-a0b9-a415bb9b3643'::uuid);

drop policy if exists "Somente administrador cria convite" on public.avaliacoes_solicitacoes;
create policy "Somente administrador cria convite"
  on public.avaliacoes_solicitacoes
  for insert to authenticated
  with check (
    (select auth.uid()) = 'ca5c30ec-828e-4c95-a0b9-a415bb9b3643'::uuid
    and exists (
      select 1 from public.solicitacoes s
      where s.id = solicitacao_id
        and lower(s.status) in ('concluído','concluido','concluída','concluida')
    )
  );

create or replace function public.registrar_avaliacao_solicitacao(
  p_convite uuid,
  p_avaliacao text
)
returns text
language plpgsql
security definer
set search_path = ''
as $function$
declare v_linhas integer;
begin
  if p_convite is null or p_avaliacao is null
     or p_avaliacao not in ('sim', 'parcialmente', 'nao') then
    return 'indisponivel';
  end if;

  update public.avaliacoes_solicitacoes a
     set avaliacao = p_avaliacao,
         respondido_em = now()
    from public.solicitacoes s
   where a.convite = p_convite
     and a.solicitacao_id = s.id
     and a.avaliacao is null
     and lower(s.status) in ('concluído','concluido','concluída','concluida');
  get diagnostics v_linhas = row_count;
  if v_linhas = 1 then return 'registrada'; end if;
  return 'indisponivel';
end;
$function$;

revoke all on function public.registrar_avaliacao_solicitacao(uuid,text) from public;
grant execute on function public.registrar_avaliacao_solicitacao(uuid,text) to anon, authenticated;

comment on table public.avaliacoes_solicitacoes is
  'Avaliacao por link individual nao enumeravel, enviada manualmente pelo mandato.';
comment on column public.avaliacoes_solicitacoes.convite is
  'Segredo de convite: acesso restrito ao administrador. Nunca publicar junto ao protocolo.';

-- Uma resposta enviada pela equipe tambem conta como movimentacao do pedido.
create or replace function public.atualizar_movimento_apos_resposta()
returns trigger language plpgsql security invoker set search_path = ''
as $function$
begin
  update public.solicitacoes
     set atualizado_em = greatest(coalesce(atualizado_em, new.criado_em), new.criado_em)
   where id = new.solicitacao_id;
  return new;
end;
$function$;
revoke all on function public.atualizar_movimento_apos_resposta() from public;
drop trigger if exists trg_atualizar_movimento_apos_resposta on public.respostas_solicitacoes;
create trigger trg_atualizar_movimento_apos_resposta
  after insert on public.respostas_solicitacoes
  for each row execute function public.atualizar_movimento_apos_resposta();
