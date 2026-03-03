-- Create bookmarked_cards table for tracking user's bookmarked flashcards
create table if not exists public.bookmarked_cards (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  card_id         uuid not null references public.cards(id) on delete cascade,
  created_at      timestamptz not null default now(),
  
  -- Ensure unique bookmark per user+card
  unique(user_id, card_id)
);

-- Set up RLS for bookmarked_cards
alter table public.bookmarked_cards enable row level security;

create policy "bookmarked_cards: owner read"
  on public.bookmarked_cards for select
  using (auth.uid() = user_id);

create policy "bookmarked_cards: owner insert"
  on public.bookmarked_cards for insert
  with check (auth.uid() = user_id);

create policy "bookmarked_cards: owner delete"
  on public.bookmarked_cards for delete
  using (auth.uid() = user_id);

-- Create index for faster queries
create index if not exists idx_bookmarked_cards_user_id on public.bookmarked_cards(user_id);
create index if not exists idx_bookmarked_cards_card_id on public.bookmarked_cards(card_id);
