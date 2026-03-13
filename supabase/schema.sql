-- ============================================================
-- Tatonic Ventures — Supabase Schema
-- Run this in Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- 1. private_holdings
create table public.private_holdings (
  id                       uuid primary key default gen_random_uuid(),
  name                     text not null,
  type                     text not null,   -- Stock | Distribution | Finance Payment
  status                   text not null default 'Open',  -- Open | Closed
  action_date              date,
  amount_invested          numeric default 0,
  valuation_at_investment  numeric,
  current_valuation        numeric,
  value                    numeric default 0,
  return_dollars           numeric generated always as (value - amount_invested) stored,
  return_pct               numeric generated always as (
    case when amount_invested = 0 then null
         else (value - amount_invested) / amount_invested
    end
  ) stored,
  notes                    text,
  created_at               timestamptz default now()
);

alter table public.private_holdings enable row level security;

create policy "auth users only" on public.private_holdings
  for all using (auth.role() = 'authenticated');

-- 2. portfolio_positions
create table public.portfolio_positions (
  id                 uuid primary key default gen_random_uuid(),
  asset_name         text not null,
  ticker             text,
  status             text not null default 'Open',  -- Open | Closed
  open_date          date,
  close_date         date,
  action_price       numeric,
  qty_shares         numeric,
  exit_price         numeric,
  current_value      numeric,
  return_dollars     numeric,
  return_pct         numeric,
  spy_price_on_date  numeric,
  notes              text,
  realized_profits   numeric,
  created_at         timestamptz default now()
);

alter table public.portfolio_positions enable row level security;

create policy "auth users only" on public.portfolio_positions
  for all using (auth.role() = 'authenticated');

-- 3. assets
create table public.assets (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  type             text not null,   -- Asset | Investment
  location         text,
  purchase_date    date,
  purchase_price   numeric default 0,
  estimated_value  numeric default 0,
  return_dollars   numeric generated always as (estimated_value - purchase_price) stored,
  return_pct       numeric generated always as (
    case when purchase_price = 0 then null
         else (estimated_value - purchase_price) / purchase_price
    end
  ) stored,
  notes            text,
  created_at       timestamptz default now()
);

alter table public.assets enable row level security;

create policy "auth users only" on public.assets
  for all using (auth.role() = 'authenticated');

-- 4. liabilities
create table public.liabilities (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  principal        numeric not null,
  current_balance  numeric not null,
  interest_rate    numeric,   -- decimal e.g. 0.03
  term_years       integer,
  notes            text,
  created_at       timestamptz default now()
);

alter table public.liabilities enable row level security;

create policy "auth users only" on public.liabilities
  for all using (auth.role() = 'authenticated');

-- 5. accounts
create table public.accounts (
  id           uuid primary key default gen_random_uuid(),
  institution  text not null,
  account_name text not null,
  account_type text not null,   -- Checking | Savings | Brokerage | Money Market
  balance      numeric default 0,
  last_updated date,
  notes        text,
  created_at   timestamptz default now()
);

alter table public.accounts enable row level security;

create policy "auth users only" on public.accounts
  for all using (auth.role() = 'authenticated');

-- 6. nav_history
create table public.nav_history (
  id                     uuid primary key default gen_random_uuid(),
  date                   date not null unique,
  total_assets           numeric,
  total_invested         numeric,
  total_liabilities      numeric,
  net_equity             numeric,
  total_return_pct       numeric,
  income_portfolio_value numeric,
  cash_balance           numeric,
  created_at             timestamptz default now()
);

alter table public.nav_history enable row level security;

create policy "auth users only" on public.nav_history
  for all using (auth.role() = 'authenticated');
