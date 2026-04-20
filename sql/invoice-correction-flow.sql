-- Apply this before enabling invoice correction flow in production.

begin;

alter table public.orders
  add column if not exists correction_of_order_id uuid references public.orders(id) on delete restrict,
  add column if not exists correction_reason text;

create index if not exists idx_orders_correction_of_order_id
  on public.orders(correction_of_order_id);

comment on column public.orders.correction_of_order_id is
  'Links a correction order to the original invoiced order.';

comment on column public.orders.correction_reason is
  'Human-readable reason for issuing the correction document.';

commit;
