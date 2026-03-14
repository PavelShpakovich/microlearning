create table if not exists public.telegram_link_tokens (
  token       text primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null,
  consumed_at timestamptz
);

alter table public.telegram_link_tokens enable row level security;

create policy "telegram_link_tokens: owner read"
  on public.telegram_link_tokens for select
  using (auth.uid() = user_id);

create index if not exists idx_telegram_link_tokens_user_id
  on public.telegram_link_tokens(user_id);

create index if not exists idx_telegram_link_tokens_expires_at
  on public.telegram_link_tokens(expires_at);