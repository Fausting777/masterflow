begin;

alter table public.order_items
  add column if not exists description text;

commit;
