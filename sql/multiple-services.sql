-- SQL миграция для поддержки нескольких услуг в заказе

begin;

-- Таблица для позиций заказа (услуг)
create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  service_id uuid references public.services(id) on delete set null,
  title text not null,
  description text,
  price decimal(10, 2) not null,
  created_at timestamptz not null default timezone('utc', now()),
  user_id uuid not null references auth.users(id)
);

alter table public.order_items
  add column if not exists description text;

-- Индексы для быстрого поиска
create index if not exists order_items_order_id_idx on public.order_items(order_id);

-- Включаем RLS
alter table public.order_items enable row level security;

-- Политики безопасности
create policy "order_items_all_own" on public.order_items
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

commit;
