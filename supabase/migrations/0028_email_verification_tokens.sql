create table if not exists public.email_verification_tokens (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null unique references auth.users(id) on delete cascade,
  email       text not null,
  token_hash  text not null unique,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null,
  consumed_at timestamptz
);

alter table public.email_verification_tokens enable row level security;

create policy "email_verification_tokens: owner read"
  on public.email_verification_tokens for select
  using (auth.uid() = user_id);

create index if not exists idx_email_verification_tokens_user_id
  on public.email_verification_tokens(user_id);

create index if not exists idx_email_verification_tokens_expires_at
  on public.email_verification_tokens(expires_at);
