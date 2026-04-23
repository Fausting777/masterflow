-- SumUp integration foundation.
-- Stores per-user SumUp connection metadata and imported payment transactions.
-- Safe to run multiple times.

begin;

create extension if not exists pgcrypto;

alter table public.orders
  add column if not exists sumup_transaction_id uuid,
  add column if not exists sumup_receipt_no text;

create table if not exists public.sumup_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  merchant_code text not null,
  access_token_encrypted text not null,
  access_token_hint text,
  refresh_token_encrypted text,
  token_expires_at timestamptz,
  last_synced_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint sumup_connections_user_unique unique (user_id)
);

alter table public.sumup_connections
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists merchant_code text,
  add column if not exists access_token_encrypted text,
  add column if not exists access_token_hint text,
  add column if not exists refresh_token_encrypted text,
  add column if not exists token_expires_at timestamptz,
  add column if not exists last_synced_at timestamptz,
  add column if not exists created_at timestamptz not null default timezone('utc', now()),
  add column if not exists updated_at timestamptz not null default timezone('utc', now());

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'sumup_connections_user_unique'
  ) then
    alter table public.sumup_connections
      add constraint sumup_connections_user_unique unique (user_id);
  end if;
end $$;

create table if not exists public.sumup_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  order_id uuid references public.orders(id) on delete set null,
  sumup_transaction_id text,
  transaction_code text,
  receipt_no text,
  amount numeric(12, 2) not null,
  currency text not null default 'EUR',
  status text,
  payment_type text,
  entry_mode text,
  paid_at timestamptz,
  raw_json jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'orders_sumup_transaction_id_fkey'
  ) then
    alter table public.orders
      add constraint orders_sumup_transaction_id_fkey
      foreign key (sumup_transaction_id)
      references public.sumup_transactions(id)
      on delete set null;
  end if;
end $$;

create unique index if not exists sumup_transactions_user_transaction_id_unique
  on public.sumup_transactions(user_id, sumup_transaction_id);

create unique index if not exists sumup_transactions_user_transaction_code_unique
  on public.sumup_transactions(user_id, transaction_code);

create index if not exists sumup_transactions_user_order_idx
  on public.sumup_transactions(user_id, order_id);

create index if not exists sumup_transactions_user_paid_at_idx
  on public.sumup_transactions(user_id, paid_at desc);

create index if not exists orders_sumup_transaction_id_idx
  on public.orders(sumup_transaction_id);

drop trigger if exists trg_sumup_connections_updated_at on public.sumup_connections;
create trigger trg_sumup_connections_updated_at
before update on public.sumup_connections
for each row
execute function public.set_updated_at();

drop trigger if exists trg_sumup_transactions_updated_at on public.sumup_transactions;
create trigger trg_sumup_transactions_updated_at
before update on public.sumup_transactions
for each row
execute function public.set_updated_at();

alter table public.sumup_connections enable row level security;
alter table public.sumup_transactions enable row level security;

drop policy if exists "sumup_connections_all_own" on public.sumup_connections;
drop policy if exists "sumup_transactions_all_own" on public.sumup_transactions;

create policy "sumup_connections_all_own" on public.sumup_connections
for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "sumup_transactions_all_own" on public.sumup_transactions
for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

comment on table public.sumup_connections is
  'Per-user SumUp connection metadata. Tokens must be encrypted by the app before storage.';

comment on table public.sumup_transactions is
  'Imported SumUp payments that can be linked to orders.';

comment on column public.orders.sumup_transaction_id is
  'Linked imported SumUp transaction for this order.';

comment on column public.orders.sumup_receipt_no is
  'SumUp receipt number copied onto the order for invoice/payment proof display.';

notify pgrst, 'reload schema';

commit;
