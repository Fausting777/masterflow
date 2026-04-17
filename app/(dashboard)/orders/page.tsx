import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import {
  formatPrice,
  formatDate,
  STATUS_LABELS,
  STATUS_COLORS,
} from '@/lib/utils/format';
import type { OrderStatus, OrderWithClient } from '@/types/database';

type SearchParams = Promise<{ status?: string }>;

const STATUS_FILTERS: Array<{ key: OrderStatus | 'all'; label: string }> = [
  { key: 'all', label: 'Все' },
  { key: 'new', label: 'Новые' },
  { key: 'in_progress', label: 'В работе' },
  { key: 'completed', label: 'Завершённые' },
  { key: 'canceled', label: 'Отменённые' },
];

export default async function OrdersPage({ searchParams }: { searchParams: SearchParams }) {
  const { status } = await searchParams;
  const activeFilter = (status ?? 'all') as OrderStatus | 'all';

  const supabase = await createClient();
  let query = supabase
    .from('orders_with_client')
    .select('*')
    .order('created_at', { ascending: false });

  if (activeFilter !== 'all') {
    query = query.eq('status', activeFilter);
  }

  const { data: orders, error } = await query;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Заказы</h1>
        <Link
          href="/orders/new"
          className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2"
        >
          + Новый
        </Link>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {STATUS_FILTERS.map((f) => {
          const active = f.key === activeFilter;
          const href = f.key === 'all' ? '/orders' : `/orders?status=${f.key}`;
          return (
            <Link
              key={f.key}
              href={href}
              className={`text-xs font-medium px-3 py-1.5 rounded-full transition ${
                active
                  ? 'bg-blue-600 text-white'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
              }`}
            >
              {f.label}
            </Link>
          );
        })}
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700 mb-4">
          Ошибка: {error.message}
        </div>
      )}

      {orders && orders.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-300 dark:border-neutral-700 p-8 text-center text-sm text-neutral-500">
          {activeFilter === 'all' ? (
            <>
              Пока нет заказов.{' '}
              <Link href="/orders/new" className="text-blue-600 hover:underline">
                Создать первый
              </Link>
            </>
          ) : (
            <>Нет заказов в этом статусе</>
          )}
        </div>
      ) : (
        <ul className="space-y-2">
          {(orders as OrderWithClient[] | null)?.map((o) => {
            const title =
              o.custom_service_title ??
              'Услуга'; /* если service_id — его название в списке мы не джойним ради простоты; на карточке покажем */
            const price = o.custom_price;
            return (
              <li key={o.id}>
                <Link
                  href={`/orders/${o.id}`}
                  className="block bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 hover:border-blue-500 transition"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[o.status]}`}>
                          {STATUS_LABELS[o.status]}
                        </span>
                        <span className="text-xs text-neutral-500">{formatDate(o.created_at)}</span>
                      </div>
                      <h3 className="font-medium truncate">{o.client_name}</h3>
                      <p className="text-sm text-neutral-500 truncate">
                        {o.custom_service_title ?? '—'}
                        {o.order_address ? ` · ${o.order_address}` : ''}
                      </p>
                    </div>
                    <div className="text-right whitespace-nowrap">
                      <div className="font-semibold">{formatPrice(price)}</div>
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}