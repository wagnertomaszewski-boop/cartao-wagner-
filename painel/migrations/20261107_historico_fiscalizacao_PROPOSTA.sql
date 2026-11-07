-- PROPOSTA PARA REVISÃO. NÃO EXECUTAR AUTOMATICAMENTE EM PRODUÇÃO.
-- Histórico append-only de fiscalização, privado ao administrador autorizado.
-- Usa a identidade administrativa já autorizada pelas políticas RLS de public.solicitacoes.\n-- PRÉ-REQUISITO: rever este identificador se a conta administrativa for alterada.\n-- Não habilitar acesso a todos os usuários autenticados.
begin;

create table if not exists public.solicitacoes_fiscalizacao_historico (
  id bigint generated always as identity primary key,
  solicitacao_id bigint not null references public.solicitacoes(id) on delete restrict,
  tipo text not null check (tipo in ('encaminhamento','cobranca','retorno','verificacao')),
  descricao text not null check (char_length(btrim(descricao)) between 5 and 2000),
  protocolo_referencia text check (protocolo_referencia is null or char_length(protocolo_referencia) <= 120),
  registrado_por uuid not null default auth.uid() references auth.users(id),
  registrado_em timestamptz not null default now()
);

alter table public.solicitacoes_fiscalizacao_historico enable row level security;
revoke all on public.solicitacoes_fiscalizacao_historico from anon, authenticated;
grant select, insert on public.solicitacoes_fiscalizacao_historico to authenticated;
grant usage, select on sequence public.solicitacoes_fiscalizacao_historico_id_seq to authenticated;

drop policy if exists "Administrador le historico de fiscalizacao" on public.solicitacoes_fiscalizacao_historico;
create policy "Administrador le historico de fiscalizacao"
on public.solicitacoes_fiscalizacao_historico for select to authenticated
using (
  auth.uid() = 'ca5c30ec-828e-4c95-a0b9-a415bb9b3643'::uuid
  and exists (select 1 from public.solicitacoes s where s.id = solicitacao_id)
);

drop policy if exists "Administrador registra fiscalizacao" on public.solicitacoes_fiscalizacao_historico;
create policy "Administrador registra fiscalizacao"
on public.solicitacoes_fiscalizacao_historico for insert to authenticated
with check (
  auth.uid() = 'ca5c30ec-828e-4c95-a0b9-a415bb9b3643'::uuid
  and registrado_por = auth.uid()
  and exists (select 1 from public.solicitacoes s where s.id = solicitacao_id)
);

-- Sem permissões UPDATE/DELETE para authenticated. Triggers adicionais devem
-- ser avaliados se for necessário impedir alterações por papéis privilegiados.
create index if not exists idx_fiscalizacao_solicitacao_data
  on public.solicitacoes_fiscalizacao_historico (solicitacao_id, registrado_em desc);

commit;
