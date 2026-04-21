-- GoBD hardening baseline.
-- Apply after the initial schema and priority-1-security.sql.

begin;

-- Make activity logs append-only for authenticated users.
drop policy if exists "activity_logs_all_own" on public.activity_logs;
drop policy if exists "activity_logs_select_own" on public.activity_logs;
drop policy if exists "activity_logs_insert_own" on public.activity_logs;

create policy "activity_logs_select_own" on public.activity_logs
for select to authenticated
using (user_id = auth.uid());

create policy "activity_logs_insert_own" on public.activity_logs
for insert to authenticated
with check (user_id = auth.uid());

create or replace function public.prevent_activity_log_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'activity_logs are append-only';
end;
$$;

drop trigger if exists trg_activity_logs_no_update on public.activity_logs;
create trigger trg_activity_logs_no_update
before update on public.activity_logs
for each row
execute function public.prevent_activity_log_mutation();

drop trigger if exists trg_activity_logs_no_delete on public.activity_logs;
create trigger trg_activity_logs_no_delete
before delete on public.activity_logs
for each row
execute function public.prevent_activity_log_mutation();

-- Protect invoice numbering behind auth.uid() and keep backward compatibility
-- for older application code that still calls next_invoice_number(p_user_id, p_year).
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

-- Block edits to core business fields once an invoice was issued or locked.
-- Allowed updates after issuance:
-- - soft archive / restore via deleted_at
-- - invoice delivery metadata via invoice_sent_at / invoice_sent_to
create or replace function public.prevent_locked_order_mutation()
returns trigger
language plpgsql
as $$
begin
  if old.invoice_number is not null or old.invoice_locked_at is not null then
    if row(
      new.user_id,
      new.correction_of_order_id,
      new.correction_reason,
      new.client_id,
      new.service_id,
      new.custom_service_title,
      new.custom_price,
      new.description,
      new.status,
      new.order_address,
      new.scheduled_at,
      new.completed_at,
      new.signature_file_path,
      new.pdf_file_path,
      new.invoice_number,
      new.invoice_issued_at,
      new.invoice_locked_at,
      new.invoice_version,
      new.invoice_snapshot_json,
      new.service_date,
      new.payment_method,
      new.created_at
    ) is distinct from row(
      old.user_id,
      old.correction_of_order_id,
      old.correction_reason,
      old.client_id,
      old.service_id,
      old.custom_service_title,
      old.custom_price,
      old.description,
      old.status,
      old.order_address,
      old.scheduled_at,
      old.completed_at,
      old.signature_file_path,
      old.pdf_file_path,
      old.invoice_number,
      old.invoice_issued_at,
      old.invoice_locked_at,
      old.invoice_version,
      old.invoice_snapshot_json,
      old.service_date,
      old.payment_method,
      old.created_at
    ) then
      raise exception 'locked invoice orders cannot be modified';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_orders_prevent_locked_mutation on public.orders;
create trigger trg_orders_prevent_locked_mutation
before update on public.orders
for each row
execute function public.prevent_locked_order_mutation();

comment on function public.prevent_activity_log_mutation() is
  'Prevents updates and deletes on activity_logs to keep the journal append-only.';

comment on function public.prevent_locked_order_mutation() is
  'Prevents business-field mutations on invoiced orders while still allowing archive and send metadata updates.';

commit;
