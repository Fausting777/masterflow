import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getRange, getLastMonths, type PeriodKey } from '@/lib/utils/date-range';
import {
  getRevenueStats,
  getStatusBreakdown,
  getMonthlyRevenue,
  getTopClients,
  getTopServices,
} from '@/lib/stats/calculate';
import RevenueChart from '@/components/stats/RevenueChart';
import { formatPrice, STATUS_LABELS, STATUS_COLORS } from '@/lib/utils/format';
import type { OrderStatus } from '@/types/database';

type SearchParams = Promise<{ period?: string }>;

const PERIOD_BUTTONS: Array<{ key: PeriodKey; label: string }> = [
  { key: 'month', label: 'Месяц' },
  { key: 'quarter', label: 'Квартал' },
  { key: 'year', label: 'Год' },
  { key: 'all', label: 'Всё время' },
];

export default async function StatsPage({ searchParams }: { searchParams: SearchParams }) {
  const { period } = await searchParams;
  const activePeriod = (period ?? 'month') as PeriodKey;
  const range = getRange(activePeriod);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Все запросы параллельно
  const months12 = getLastMonths(12);
  const [revenue, statuses, monthly, topClients, topServices] = await Promise.all([
    getRevenueStats(supabase, user!.id, range.from, range.to),
    getStatusBreakdown(supabase, user!.id, range.from, range.to),
    getMonthlyRevenue(
      supabase,
      user!.id,
      months12.map(m => ({ from: m.from, to: m.to }))
    ),
    getTopClients(supabase, user!.id, range.from, range.to),
    getTopServices(supabase, user!.id, range.from, range.to),
  ]);

  const statusOrder: OrderStatus[] = ['new', 'in_progress', 'completed', 'canceled'];
  const totalOrders = Object.values(statuses).reduce((a, b) => a + b, 0);

  return (
    <div>
      <div className="mb-4">
        <Link href="/dashboard" className="text-sm text-neutral-500 hover:text-neutral-700">
          ← На дашборд
        </Link>
      </div>

      <h1 className="text-2xl font-semibold mb-1">Статистика</h1>
      <p className="text-sm text-neutral-500 mb-4">{range.label}</p>

      {/* Переключатель периода */}
      <div className="flex flex-wrap gap-2 mb-6">
        {PERIOD_BUTTONS.map(p => {
          const active = p.key === activePeriod;
          const href = `/stats?period=${p.key}`;
          return (
            <Link
              key={p.key}
              href={href}
              className={`text-sm font-medium px-3 py-1.5 rounded-full transition ${
                active
                  ? 'bg-blue-600 text-white'
                  : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
              }`}
            >
              {p.label}
            </Link>
          );
        })}
      </div>

      {/* Главные цифры */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-5">
          <div className="text-xs text-neutral-500 uppercase tracking-wide mb-1">Выручка</div>
          <div className="text-2xl font-bold">{formatPrice(revenue.total)}</div>
        </div>
        <div className="bg-white border border-neutral-200 rounded-xl p-5">
          <div className="text-xs text-neutral-500 uppercase tracking-wide mb-1">Счетов</div>
          <div className="text-2xl font-bold">{revenue.invoicesCount}</div>
        </div>
        <div className="bg-white border border-neutral-200 rounded-xl p-5">
          <div className="text-xs text-neutral-500 uppercase tracking-wide mb-1">Средний чек</div>
          <div className="text-2xl font-bold">{formatPrice(revenue.avgCheck)}</div>
        </div>
      </div>

      {/* График по месяцам */}
      <div className="bg-white border border-neutral-200 rounded-xl p-5 mb-6">
        <h2 className="text-sm font-medium text-neutral-500 mb-1">Выручка по месяцам</h2>
        <RevenueChart
          months={months12.map(m => ({ label: m.label, fullLabel: m.fullLabel }))}
          values={monthly}
        />
      </div>

      {/* Статусы заказов */}
      <div className="bg-white border border-neutral-200 rounded-xl p-5 mb-6">
        <h2 className="text-sm font-medium text-neutral-500 mb-3">
          Заказы по статусам <span className="text-neutral-400">· {totalOrders} всего</span>
        </h2>
        {totalOrders === 0 ? (
          <p className="text-sm text-neutral-400 italic">Нет заказов в этом периоде</p>
        ) : (
          <div className="space-y-2">
            {statusOrder.map(s => {
              const count = statuses[s];
              const pct = totalOrders > 0 ? (count / totalOrders) * 100 : 0;
              return (
                <div key={s}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[s]}`}>
                      {STATUS_LABELS[s]}
                    </span>
                    <span className="font-semibold">{count}</span>
                  </div>
                  <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Двухколоночный блок: топ клиентов и топ услуг */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Топ клиентов */}
        <div className="bg-white border border-neutral-200 rounded-xl p-5">
          <h2 className="text-sm font-medium text-neutral-500 mb-3">
            🏆 Топ клиентов <span className="text-neutral-400">по выручке</span>
          </h2>
          {topClients.length === 0 ? (
            <p className="text-sm text-neutral-400 italic">Нет данных</p>
          ) : (
            <ul className="space-y-2">
              {topClients.map((c, i) => (
                <li key={c.clientId}>
                  <Link
                    href={`/clients/${c.clientId}`}
                    className="flex items-center justify-between gap-3 p-2 -mx-2 rounded hover:bg-neutral-50"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs w-5 text-center text-neutral-400 font-mono">
                        {i + 1}.
                      </span>
                      <span className="text-sm truncate">{c.name}</span>
                    </div>
                    <div className="text-right whitespace-nowrap">
                      <div className="text-sm font-semibold">{formatPrice(c.total)}</div>
                      <div className="text-xs text-neutral-500">
                        {c.count} {c.count === 1 ? 'счёт' : c.count < 5 ? 'счёта' : 'счетов'}
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Топ услуг */}
        <div className="bg-white border border-neutral-200 rounded-xl p-5">
          <h2 className="text-sm font-medium text-neutral-500 mb-3">
            🛠 Топ услуг <span className="text-neutral-400">по частоте</span>
          </h2>
          {topServices.length === 0 ? (
            <p className="text-sm text-neutral-400 italic">Нет данных</p>
          ) : (
            <ul className="space-y-2">
              {topServices.map((s, i) => (
                <li key={`${i}-${s.title}`} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs w-5 text-center text-neutral-400 font-mono">
                      {i + 1}.
                    </span>
                    <span className="text-sm truncate">{s.title}</span>
                  </div>
                  <span className="text-sm font-semibold whitespace-nowrap">
                    {s.count}×
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Подсказка */}
      <div className="text-xs text-neutral-500 bg-neutral-50 rounded-lg p-3">
        💡 В «Выручку» входят только заказы с выставленным счётом (есть номер вида 2026-XXXX).
        Заказы без счёта не учитываются.
      </div>
    </div>
  );
}