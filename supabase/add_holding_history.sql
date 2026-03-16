-- Run this in Supabase SQL Editor → New Query

create table public.holding_value_history (
  id         uuid primary key default gen_random_uuid(),
  holding_id uuid not null references public.private_holdings(id) on delete cascade,
  date       date not null,
  value      numeric not null,
  notes      text,
  created_at timestamptz default now()
);

create index on public.holding_value_history (holding_id, date);

alter table public.holding_value_history enable row level security;

create policy "auth users only" on public.holding_value_history
  for all using (auth.role() = 'authenticated');
