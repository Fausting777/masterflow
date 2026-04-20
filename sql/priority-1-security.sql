-- Priority 1 security baseline for Supabase.
-- Review against your live schema before applying.

begin;

alter table public.profiles enable row level security;
alter table public.clients enable row level security;
alter table public.services enable row level security;
alter table public.orders enable row level security;
alter table public.order_photos enable row level security;
alter table public.activity_logs enable row level security;
alter table public.expenses enable row level security;

create policy "profiles_select_own" on public.profiles
for select to authenticated
using (id = auth.uid());

create policy "profiles_insert_own" on public.profiles
for insert to authenticated
with check (id = auth.uid());

create policy "profiles_update_own" on public.profiles
for update to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy "clients_all_own" on public.clients
for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "services_all_own" on public.services
for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "orders_all_own" on public.orders
for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "order_photos_all_own" on public.order_photos
for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "activity_logs_all_own" on public.activity_logs
for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "expenses_all_own" on public.expenses
for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "storage_read_own_assets"
on storage.objects for select to authenticated
using (
  bucket_id in ('order-photos', 'order-signatures', 'order-pdfs', 'receipts')
  and split_part(name, '/', 1) = auth.uid()::text
);

create policy "storage_insert_own_assets"
on storage.objects for insert to authenticated
with check (
  bucket_id in ('order-photos', 'order-signatures', 'order-pdfs', 'receipts')
  and split_part(name, '/', 1) = auth.uid()::text
);

create policy "storage_update_own_assets"
on storage.objects for update to authenticated
using (
  bucket_id in ('order-photos', 'order-signatures', 'order-pdfs', 'receipts')
  and split_part(name, '/', 1) = auth.uid()::text
)
with check (
  bucket_id in ('order-photos', 'order-signatures', 'order-pdfs', 'receipts')
  and split_part(name, '/', 1) = auth.uid()::text
);

create policy "storage_delete_own_assets"
on storage.objects for delete to authenticated
using (
  bucket_id in ('order-photos', 'order-signatures', 'order-pdfs', 'receipts')
  and split_part(name, '/', 1) = auth.uid()::text
);

-- RPC pattern: derive the user from auth.uid() inside the function.
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

commit;
