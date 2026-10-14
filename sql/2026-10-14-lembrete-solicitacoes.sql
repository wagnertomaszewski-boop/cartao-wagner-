-- Lembrete interno por solicitação.
-- Campo visível apenas no painel administrativo; a consulta pública por protocolo
-- não retorna esta coluna.

alter table public.solicitacoes
add column if not exists lembrete_em date;
