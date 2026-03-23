create table public.card_ratings (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references auth.users(id) on delete cascade,
  card_id    uuid        not null references public.cards(id) on delete cascade,
  rating     smallint    not null check (rating in (1, -1)),
  created_at timestamptz not null default now(),
  unique (user_id, card_id)
);

alter table public.card_ratings enable row level security;

create policy "card_ratings: owner read"
  on public.card_ratings for select
  using (auth.uid() = user_id);

create policy "card_ratings: owner insert"
  on public.card_ratings for insert
  with check (auth.uid() = user_id);

create policy "card_ratings: owner update"
  on public.card_ratings for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "card_ratings: owner delete"
  on public.card_ratings for delete
  using (auth.uid() = user_id);

create index idx_card_ratings_user_id on public.card_ratings(user_id);
create index idx_card_ratings_card_id on public.card_ratings(card_id);
