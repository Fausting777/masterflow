-- Apply this before enabling immutable invoice snapshots in production.

begin;

alter table public.orders
  add column if not exists invoice_locked_at timestamptz,
  add column if not exists invoice_version integer not null default 0,
  add column if not exists invoice_snapshot_json jsonb;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'orders_invoice_version_nonnegative'
  ) then
    alter table public.orders
      add constraint orders_invoice_version_nonnegative
      check (invoice_version >= 0);
  end if;
end $$;

comment on column public.orders.invoice_locked_at is
  'Timestamp when invoice data became immutable.';

comment on column public.orders.invoice_version is
  'Invoice revision/version counter. Initial issued invoice is version 1.';

comment on column public.orders.invoice_snapshot_json is
  'Immutable snapshot of customer/master/order fields used to generate the invoice.';

commit;
