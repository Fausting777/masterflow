import { getRange } from '@/lib/utils/date-range';
import { getRevenueStats } from '@/lib/stats/calculate';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import {
  formatPrice,
  formatDate,
  STATUS_LABELS,
  STATUS_COLORS,
} from '@/lib/utils/format';
import type { OrderWithClient } from '@/types/database';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [clientsCountRes, servicesCountRes, ordersActiveCountRes, recentOrdersRes] = await Promise.all([
    supabase.from('clients').select('*', { count: 'exact', head: true }),
    supabase.from('services').select('*', { count: 'exact', head: true }),
    supabase.from('orders').select('*', { count: 'exact', head: true })
  .in('status', ['new', 'in_progress'])
  .is('deleted_at', null),
    supabase
  .from('orders_with_client')
  .select('*')
  .is('deleted_at', null)
  .order('created_at', { ascending: false })
  .limit(5),
  ]);

  const recent = (recentOrdersRes.data ?? []) as OrderWithClient[];
// Статистика за текущий месяц
const monthRange = getRange('month');
const monthStats = await getRevenueStats(
  supabase,
  user!.id,
  monthRange.from,
  monthRange.to
);
  return (
    <div>
      <h1 className="text-2xl font-semibold mb-1">Рабочий стол</h1>
      <p className="text-sm text-neutral-500 mb-6">{user!.email}</p>
{/* Финансы за месяц */}
<div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-5 mb-4">
  <div className="flex items-center justify-between mb-3">
    <div>
      <div className="text-xs text-neutral-500 uppercase tracking-wide">
        Выручка за {monthRange.label}
      </div>
      <div className="text-3xl font-bold mt-1">
        {formatPrice(monthStats.total)}
      </div>
    </div>
    <Link
      href="/stats"
      className="text-sm text-blue-700 hover:text-blue-900 font-medium whitespace-nowrap"
    >
      Подробнее →
    </Link>
  </div>
  <div className="flex gap-4 text-xs text-neutral-600 pt-3 border-t border-blue-200">
    <div>
      <span className="text-neutral-500">Счетов: </span>
      <span className="font-semibold">{monthStats.invoicesCount}</span>
    </div>
    <div>
      <span className="text-neutral-500">Средний чек: </span>
      <span className="font-semibold">{formatPrice(monthStats.avgCheck)}</span>
    </div>
  </div>
</div>
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 mb-6">
        <StatCard href="/orders" label="Активные заказы" value={ordersActiveCountRes.count ?? 0} accent />
        <StatCard href="/clients" label="Клиенты" value={clientsCountRes.count ?? 0} />
        <StatCard href="/services" label="Услуги" value={servicesCountRes.count ?? 0} />
      </div>

      <div className="flex items-center justify-between mb-3 gap-3">
  <h2 className="text-sm font-medium text-neutral-500">Последние заказы</h2>
  <div className="flex items-center gap-3">
    <Link href="/orders/trash" className="text-sm text-neutral-500 hover:text-neutral-700">
      🗑 Корзина
    </Link>
    <Link href="/orders/new" className="text-sm text-blue-600 hover:underline">
      + Новый
    </Link>
  </div>
</div>

      {recent.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-300 dark:border-neutral-700 p-8 text-center text-sm text-neutral-500">
          Пока нет заказов
        </div>
      ) : (
        <ul className="space-y-2">
          {recent.map((o) => (
            <li key={o.id}>
              <Link
                href={`/orders/${o.id}`}
                className="block bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 hover:border-blue-500 transition"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[o.status]}`}>
                        {STATUS_LABELS[o.status]}
                      </span>
                      <span className="text-xs text-neutral-500">{formatDate(o.created_at)}</span>
                    </div>
                    <div className="font-medium truncate">{o.client_name}</div>
                    <div className="text-sm text-neutral-500 truncate">{o.custom_service_title ?? '—'}</div>
                  </div>
                  <div className="text-right font-semibold whitespace-nowrap">
                    {formatPrice(o.custom_price)}
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function StatCard({
  href,
  label,
  value,
  accent = false,
}: {
  href: string;
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`block rounded-xl p-4 border transition ${
        accent
          ? 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900 hover:border-blue-400'
          : 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 hover:border-blue-500'
      }`}
    >
      <div className="text-xs text-neutral-500 mb-1">{label}</div>
      <div className="text-2xl font-semibold">{value}</div>
    </Link>
  );
}