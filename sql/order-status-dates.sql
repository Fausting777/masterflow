-- Ensures legacy databases have the date columns used by order status flows.
-- Safe to run multiple times.

begin;

alter table public.orders
  add column if not exists service_date timestamptz,
  add column if not exists completed_at timestamptz;

comment on column public.orders.service_date is
  'Actual date/time when the service was carried out.';

comment on column public.orders.completed_at is
  'Timestamp when the order status was set to completed.';

notify pgrst, 'reload schema';

commit;
