-- Adds payment metadata for immediately paid invoices/receipts.
-- Safe to run multiple times.

begin;

alter table public.orders
  add column if not exists payment_provider text,
  add column if not exists paid_at timestamptz;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'orders_payment_provider_check'
  ) then
    alter table public.orders
      add constraint orders_payment_provider_check
      check (payment_provider is null or payment_provider in ('sumup'));
  end if;
end $$;

comment on column public.orders.payment_provider is
  'Optional payment provider used for immediate payment proof, e.g. SumUp.';

comment on column public.orders.paid_at is
  'Timestamp when the invoice was paid by the customer.';

commit;
