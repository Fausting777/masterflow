begin;

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

alter table public.expenses
  add column if not exists order_id uuid references public.orders(id) on delete set null,
  add column if not exists expense_date date not null default current_date,
  add column if not exists tax_deductible boolean not null default true,
  add column if not exists receipt_sha256 text,
  add column if not exists updated_at timestamptz not null default timezone('utc', now()),
  add column if not exists deleted_at timestamptz;

drop trigger if exists trg_expenses_updated_at on public.expenses;
create trigger trg_expenses_updated_at
before update on public.expenses
for each row
execute function public.set_updated_at();

alter table public.expenses enable row level security;

drop policy if exists "expenses_all_own" on public.expenses;
create policy "expenses_all_own" on public.expenses
for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

commit;
