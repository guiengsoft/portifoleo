create table if not exists public.mensagens (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (char_length(nome) between 2 and 100),
  email text not null check (char_length(email) between 5 and 150),
  mensagem text not null check (char_length(mensagem) between 5 and 2000),
  email_enviado boolean not null default false,
  lida boolean not null default false,
  criado_em timestamptz not null default now()
);

create index if not exists mensagens_email_criado_idx
  on public.mensagens (email, criado_em desc);

alter table public.mensagens enable row level security;

revoke all on public.mensagens from anon, authenticated;
