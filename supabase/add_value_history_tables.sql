-- Run in Supabase SQL Editor → New query

-- Portfolio position value history
create table public.portfolio_value_history (
  id          uuid primary key default gen_random_uuid(),
  position_id uuid not null references public.portfolio_positions(id) on delete cascade,
  date        date not null,
  value       numeric not null,
  created_at  timestamptz default now(),
  unique (position_id, date)
);
create index on public.portfolio_value_history (position_id, date);
alter table public.portfolio_value_history enable row level security;
create policy "auth users only" on public.portfolio_value_history
  for all using (auth.role() = 'authenticated');

-- Asset value history
create table public.asset_value_history (
  id       uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.assets(id) on delete cascade,
  date     date not null,
  value    numeric not null,
  created_at timestamptz default now(),
  unique (asset_id, date)
);
create index on public.asset_value_history (asset_id, date);
alter table public.asset_value_history enable row level security;
create policy "auth users only" on public.asset_value_history
  for all using (auth.role() = 'authenticated');

-- Account balance history
create table public.account_balance_history (
  id         uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  date       date not null,
  balance    numeric not null,
  created_at timestamptz default now(),
  unique (account_id, date)
);
create index on public.account_balance_history (account_id, date);
alter table public.account_balance_history enable row level security;
create policy "auth users only" on public.account_balance_history
  for all using (auth.role() = 'authenticated');

-- Also add unique constraint to holding_value_history if not already there
alter table public.holding_value_history
  add constraint if not exists holding_value_history_holding_id_date_key unique (holding_id, date);
