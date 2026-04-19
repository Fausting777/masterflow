import InvoiceBadges from '@/components/orders/InvoiceBadges';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import {
  formatPrice,
  formatDate,
  STATUS_LABELS,
  STATUS_COLORS,
} from '@/lib/utils/format';
import type { OrderStatus, OrderWithClient } from '@/types/database';

type SearchParams = Promise<{
  status?: string;
  invoice?: string;
  q?: string;
}>;

const STATUS_FILTERS: Array<{ key: OrderStatus | 'all'; label: string }> = [
  { key: 'all', label: 'Все' },
  { key: 'new', label: 'Новые' },
  { key: 'in_progress', label: 'В работе' },
  { key: 'completed', label: 'Завершённые' },
  { key: 'canceled', label: 'Отменённые' },
];

const INVOICE_FILTERS: Array<{ key: string; label: string; emoji: string }> = [
  { key: 'all', label: 'Все', emoji: '' },
  { key: 'with', label: 'Со счётом', emoji: '📄' },
  { key: 'without', label: 'Без счёта', emoji: '○' },
  { key: 'sent', label: 'Отправленные', emoji: '✉' },
];

export default async function OrdersPage({ searchParams }: { searchParams: SearchParams }) {
  const { status, invoice, q } = await searchParams;
  const activeFilter = (status ?? 'all') as OrderStatus | 'all';
  const invoiceFilter = (invoice ?? 'all') as 'all' | 'with' | 'without' | 'sent';

  const supabase = await createClient();

  let query = supabase
    .from('orders_with_client')
    .select('*')
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (activeFilter !== 'all') {
    query = query.eq('status', activeFilter);
  }

  if (invoiceFilter === 'with') {
    query = query.not('invoice_number', 'is', null);
  } else if (invoiceFilter === 'without') {
    query = query.is('invoice_number', null);
  } else if (invoiceFilter === 'sent') {
    query = query.not('invoice_sent_at', 'is', null);
  }

  const { data: orders, error } = await query;

  // Хелпер для формирования ссылок с сохранением параметров
  function buildHref(params: { status?: string; invoice?: string }) {
    const sp = new URLSearchParams();
    const st = params.status ?? activeFilter;
    const inv = params.invoice ?? invoiceFilter;
    if (st && st !== 'all') sp.set('status', st);
    if (inv && inv !== 'all') sp.set('invoice', inv);
    if (q) sp.set('q', q);
    return `/orders${sp.toString() ? `?${sp}` : ''}`;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-3">
        <h1 className="text-2xl font-semibold">Заказы</h1>
        <div className="flex items-center gap-2">
          <Link
            href="/orders/trash"
            className="text-sm text-neutral-600 hover:text-neutral-900 px-3 py-2 rounded-lg hover:bg-neutral-100"
            title="Корзина"
          >
            🗑
          </Link>
          <Link
            href="/orders/new"
            className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2"
          >
            + Новый
          </Link>
        </div>
      </div>

      {/* Фильтр по статусу */}
      <div className="flex flex-wrap gap-2 mb-3">
        {STATUS_FILTERS.map((f) => {
          const active = f.key === activeFilter;
          return (
            <Link
              key={f.key}
              href={buildHref({ status: f.key })}
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

      {/* Фильтр по счёту */}
      <div className="flex flex-wrap gap-2 mb-4">
        {INVOICE_FILTERS.map((f) => {
          const active = f.key === invoiceFilter;
          return (
            <Link
              key={f.key}
              href={buildHref({ invoice: f.key })}
              className={`text-xs font-medium px-3 py-1 rounded-full transition ${
                active
                  ? 'bg-blue-600 text-white'
                  : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
              }`}
            >
              {f.emoji && <span className="mr-1">{f.emoji}</span>}
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
          {activeFilter === 'all' && invoiceFilter === 'all' ? (
            <>
              Пока нет заказов.{' '}
              <Link href="/orders/new" className="text-blue-600 hover:underline">
                Создать первый
              </Link>
            </>
          ) : (
            <>Нет заказов по этому фильтру</>
          )}
        </div>
      ) : (
        <ul className="space-y-2">
          {(orders as OrderWithClient[] | null)?.map((o) => {
            const price = o.custom_price;
            return (
              <li key={o.id}>
                <Link
                  href={`/orders/${o.id}`}
                  className="block bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 hover:border-blue-500 transition"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[o.status]}`}>
                          {STATUS_LABELS[o.status]}
                        </span>
                        <InvoiceBadges
                          invoiceNumber={o.invoice_number}
                          invoiceSentAt={o.invoice_sent_at}
                        />
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