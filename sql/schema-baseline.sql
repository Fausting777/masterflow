-- Schema baseline for existing databases that are missing foundational objects.
-- Safe to run multiple times.

begin;

create extension if not exists pgcrypto;

create table if not exists public.invoice_sequences (
  user_id uuid not null,
  year integer not null,
  current_value integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, year),
  constraint invoice_sequences_year_positive check (year >= 2000),
  constraint invoice_sequences_current_value_nonnegative check (current_value >= 0)
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists trg_invoice_sequences_updated_at on public.invoice_sequences;
create trigger trg_invoice_sequences_updated_at
before update on public.invoice_sequences
for each row
execute function public.set_updated_at();

alter table public.invoice_sequences enable row level security;

drop policy if exists "invoice_sequences_select_own" on public.invoice_sequences;
drop policy if exists "invoice_sequences_insert_own" on public.invoice_sequences;
drop policy if exists "invoice_sequences_update_own" on public.invoice_sequences;

create policy "invoice_sequences_select_own" on public.invoice_sequences
for select to authenticated
using (user_id = auth.uid());

create policy "invoice_sequences_insert_own" on public.invoice_sequences
for insert to authenticated
with check (user_id = auth.uid());

create policy "invoice_sequences_update_own" on public.invoice_sequences
for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create or replace function public.next_invoice_number_secure(p_year integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_next integer;
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  insert into public.invoice_sequences as s (user_id, year, current_value)
  values (v_user_id, p_year, 1)
  on conflict (user_id, year)
  do update set current_value = s.current_value + 1
  returning current_value into v_next;

  return v_next;
end;
$$;

create or replace function public.next_invoice_number(p_user_id uuid, p_year integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  if p_user_id is distinct from auth.uid() then
    raise exception 'invoice sequence access denied';
  end if;

  return public.next_invoice_number_secure(p_year);
end;
$$;

comment on table public.invoice_sequences is
  'Per-user yearly invoice number sequence.';

comment on function public.next_invoice_number_secure(integer) is
  'Returns the next invoice number for the authenticated user and year.';

comment on function public.next_invoice_number(uuid, integer) is
  'Backward-compatible wrapper around next_invoice_number_secure.';

commit;
