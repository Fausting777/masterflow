-- Audit trail baseline for GoBD-sensitive records.
-- Apply after gobd-hardening.sql.

begin;

create table if not exists public.audit_trail (
  id uuid primary key default gen_random_uuid(),
  table_name text not null,
  record_id uuid not null,
  user_id uuid null,
  operation text not null check (operation in ('INSERT', 'UPDATE', 'DELETE')),
  changed_fields text[] not null default '{}',
  old_data jsonb null,
  new_data jsonb null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_audit_trail_table_record_created
  on public.audit_trail(table_name, record_id, created_at desc);

create index if not exists idx_audit_trail_user_created
  on public.audit_trail(user_id, created_at desc);

alter table public.audit_trail enable row level security;

drop policy if exists "audit_trail_select_own" on public.audit_trail;
drop policy if exists "audit_trail_insert_own" on public.audit_trail;

create policy "audit_trail_select_own" on public.audit_trail
for select to authenticated
using (user_id = auth.uid() or user_id is null);

create policy "audit_trail_insert_own" on public.audit_trail
for insert to authenticated
with check (user_id = auth.uid() or user_id is null);

create or replace function public.prevent_audit_trail_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'audit_trail is append-only';
end;
$$;

drop trigger if exists trg_audit_trail_no_update on public.audit_trail;
create trigger trg_audit_trail_no_update
before update on public.audit_trail
for each row
execute function public.prevent_audit_trail_mutation();

drop trigger if exists trg_audit_trail_no_delete on public.audit_trail;
create trigger trg_audit_trail_no_delete
before delete on public.audit_trail
for each row
execute function public.prevent_audit_trail_mutation();

create or replace function public.audit_changed_fields(old_row jsonb, new_row jsonb)
returns text[]
language sql
immutable
as $$
  select coalesce(array_agg(key order by key), '{}'::text[])
  from (
    select key
    from jsonb_object_keys(coalesce(old_row, '{}'::jsonb) || coalesce(new_row, '{}'::jsonb)) as key
    where coalesce(old_row -> key, 'null'::jsonb) is distinct from coalesce(new_row -> key, 'null'::jsonb)
  ) changed;
$$;

create or replace function public.write_audit_trail()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_old jsonb;
  v_new jsonb;
  v_record_id uuid;
  v_changed_fields text[];
begin
  if tg_op = 'INSERT' then
    v_new := to_jsonb(new);
    v_record_id := new.id;
    v_changed_fields := public.audit_changed_fields(null, v_new);
  elsif tg_op = 'UPDATE' then
    v_old := to_jsonb(old);
    v_new := to_jsonb(new);
    v_record_id := new.id;
    v_changed_fields := public.audit_changed_fields(v_old, v_new);
  elsif tg_op = 'DELETE' then
    v_old := to_jsonb(old);
    v_record_id := old.id;
    v_changed_fields := public.audit_changed_fields(v_old, null);
  else
    raise exception 'unsupported trigger operation: %', tg_op;
  end if;

  insert into public.audit_trail (
    table_name,
    record_id,
    user_id,
    operation,
    changed_fields,
    old_data,
    new_data
  )
  values (
    tg_table_name,
    v_record_id,
    v_user_id,
    tg_op,
    v_changed_fields,
    v_old,
    v_new
  );

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_audit_orders on public.orders;
create trigger trg_audit_orders
after insert or update or delete on public.orders
for each row
execute function public.write_audit_trail();

drop trigger if exists trg_audit_expenses on public.expenses;
create trigger trg_audit_expenses
after insert or update or delete on public.expenses
for each row
execute function public.write_audit_trail();

comment on table public.audit_trail is
  'Append-only database audit trail for GoBD-sensitive records.';

comment on function public.write_audit_trail() is
  'Writes insert/update/delete row snapshots to audit_trail for protected tables.';

commit;
