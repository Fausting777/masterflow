import Link from 'next/link';
import { getDictionary, getLocale } from '@/lib/i18n/server';
import { getExpensesSummary } from '@/lib/stats/expenses';
import { getRevenueStats } from '@/lib/stats/calculate';
import { createClient } from '@/lib/supabase/server';
import { getRange, toDateOnly } from '@/lib/utils/date-range';
import { formatPrice } from '@/lib/utils/format';
import type { OrderWithClient } from '@/types/database';

const DASH = '-';

export default async function DashboardPage() {
  const supabase = await createClient();
  const [{ data: auth }, { t }, locale] = await Promise.all([
    supabase.auth.getUser(),
    getDictionary(),
    getLocale(),
  ]);
  const user = auth.user;

  const [clientsCountRes, servicesCountRes, ordersCountRes, recentOrdersRes] = await Promise.all([
    supabase.from('clients').select('*', { count: 'exact', head: true }),
    supabase.from('services').select('*', { count: 'exact', head: true }),
    supabase.from('orders').select('*', { count: 'exact', head: true }).is('deleted_at', null),
    supabase
      .from('orders_with_client')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(5),
  ]);

  const recent = (recentOrdersRes.data ?? []) as OrderWithClient[];
  const monthRange = getRange('month', new Date(), { locale });
  const monthStats = await getRevenueStats(supabase, user!.id, monthRange.from, monthRange.to);
  const monthExpenses = await getExpensesSummary(
    supabase,
    user!.id,
    toDateOnly(monthRange.from),
    toDateOnly(monthRange.to)
  );
  const monthProfit = monthStats.total - monthExpenses.total;

  const formatDateLocal = (value: string | null | undefined) =>
    value
      ? new Date(value).toLocaleDateString(locale === 'de' ? 'de-DE' : 'ru-RU', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        })
      : DASH;

  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold">{t.dashboard.title}</h1>
      <p className="mb-6 text-sm text-neutral-500">{user!.email}</p>

      <div className="mb-4 rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-5">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-wide text-neutral-500">{monthRange.label}</div>
            <div className={`mt-1 text-3xl font-bold ${monthProfit >= 0 ? 'text-blue-900' : 'text-orange-700'}`}>
              {formatPrice(monthProfit)}
            </div>
            <div className="mt-0.5 text-xs text-neutral-500">
              {monthProfit >= 0 ? t.dashboard.profit : t.dashboard.loss} {t.dashboard.forMonth}
            </div>
          </div>
          <Link href="/stats" className="whitespace-nowrap text-sm font-medium text-blue-700 hover:text-blue-900">
            {t.dashboard.details} →
          </Link>
        </div>
        <div className="grid grid-cols-3 gap-2 border-t border-blue-200 pt-3">
          <div>
            <div className="text-xs text-neutral-500">{t.dashboard.revenue}</div>
            <div className="text-sm font-semibold text-green-700">{formatPrice(monthStats.total)}</div>
          </div>
          <div>
            <div className="text-xs text-neutral-500">{t.dashboard.expenses}</div>
            <div className="text-sm font-semibold text-rose-700">{formatPrice(monthExpenses.total)}</div>
          </div>
          <div>
            <div className="text-xs text-neutral-500">{t.dashboard.invoices}</div>
            <div className="text-sm font-semibold">{monthStats.invoicesCount}</div>
          </div>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard href="/orders" label={t.nav.orders} value={ordersCountRes.count ?? 0} accent />
        <StatCard href="/clients" label={t.nav.clients} value={clientsCountRes.count ?? 0} />
        <StatCard href="/services" label={t.nav.services} value={servicesCountRes.count ?? 0} />
      </div>

      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-medium text-neutral-500">{t.dashboard.recentOrders}</h2>
        <div className="flex items-center gap-3">
          <Link href="/orders/trash" className="text-sm text-neutral-500 hover:text-neutral-700">
            {t.dashboard.trash}
          </Link>
          <Link href="/orders/new" className="text-sm text-blue-600 hover:underline">
            + {t.dashboard.new}
          </Link>
        </div>
      </div>

      {recent.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-300 p-8 text-center text-sm text-neutral-500 dark:border-neutral-700">
          {t.dashboard.empty}
        </div>
      ) : (
        <ul className="space-y-2">
          {recent.map((o) => (
            <li key={o.id}>
              <Link
                href={`/orders/${o.id}`}
                className="block rounded-xl border border-neutral-200 bg-white p-4 transition hover:border-blue-500 dark:border-neutral-800 dark:bg-neutral-900"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 text-xs text-neutral-500">{formatDateLocal(o.created_at)}</div>
                    <div className="truncate font-medium">{o.client_name}</div>
                    <div className="truncate text-sm text-neutral-500">{o.custom_service_title ?? DASH}</div>
                  </div>
                  <div className="whitespace-nowrap text-right font-semibold">{formatPrice(o.custom_price)}</div>
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
      className={`block rounded-xl border p-4 transition ${
        accent
          ? 'border-blue-200 bg-blue-50 hover:border-blue-400 dark:border-blue-900 dark:bg-blue-950/30'
          : 'border-neutral-200 bg-white hover:border-blue-500 dark:border-neutral-800 dark:bg-neutral-900'
      }`}
    >
      <div className="mb-1 text-xs text-neutral-500">{label}</div>
      <div className="text-2xl font-semibold">{value}</div>
    </Link>
  );
}
