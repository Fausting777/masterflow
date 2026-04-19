import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import {
  getRange,
  getPreviousRange,
  getLastMonths,
  getMonthOptions,
  type PeriodKey,
} from '@/lib/utils/date-range';
import {
  getRevenueStats,
  getStatusBreakdown,
  getMonthlyRevenue,
  getTopClients,
  getTopServices,
  getOrdersWithoutInvoice,
} from '@/lib/stats/calculate';
import RevenueChart from '@/components/stats/RevenueChart';
import PeriodPicker from '@/components/stats/PeriodPicker';
import ChangeIndicator from '@/components/stats/ChangeIndicator';
import { formatPrice, STATUS_LABELS, STATUS_COLORS } from '@/lib/utils/format';
import type { OrderStatus } from '@/types/database';

type SearchParams = Promise<{
  period?: string;
  from?: string;
  to?: string;
  m?: string; // specific month "2026-04"
}>;

export default async function StatsPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const activePeriod = (sp.period ?? 'month') as PeriodKey;

  // Формируем текущий диапазон
  const rangeOptions: { from?: Date; to?: Date; specificMonth?: string } = {};
  if (activePeriod === 'custom' && sp.from && sp.to) {
    rangeOptions.from = new Date(sp.from + 'T00:00:00');
    rangeOptions.to = new Date(sp.to + 'T23:59:59');
  }
  if (activePeriod === 'month' && sp.m) {
    rangeOptions.specificMonth = sp.m;
  }

  const range = getRange(activePeriod, new Date(), rangeOptions);
  const previousRange = activePeriod === 'all' ? null : getPreviousRange(range);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Параллельные запросы для текущего и предыдущего периода
  const months12 = getLastMonths(12);
  const monthOptions = getMonthOptions(2024);

  const [
    revenue,
    statuses,
    monthly,
    topClients,
    topServices,
    ordersNoInvoice,
    // Предыдущий период — только выручка для сравнения
    revenuePrev,
    ordersNoInvoicePrev,
  ] = await Promise.all([
    getRevenueStats(supabase, user!.id, range.from, range.to),
    getStatusBreakdown(supabase, user!.id, range.from, range.to),
    getMonthlyRevenue(
      supabase,
      user!.id,
      months12.map(m => ({ from: m.from, to: m.to }))
    ),
    getTopClients(supabase, user!.id, range.from, range.to),
    getTopServices(supabase, user!.id, range.from, range.to),
    getOrdersWithoutInvoice(supabase, user!.id, range.from, range.to),
    previousRange
      ? getRevenueStats(supabase, user!.id, previousRange.from, previousRange.to)
      : Promise.resolve({ total: 0, invoicesCount: 0, avgCheck: 0 }),
    previousRange
      ? getOrdersWithoutInvoice(supabase, user!.id, previousRange.from, previousRange.to)
      : Promise.resolve([]),
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

      {/* Выбор периода */}
      <PeriodPicker
        currentPeriod={activePeriod}
        currentFrom={sp.from ?? null}
        currentTo={sp.to ?? null}
        currentMonth={sp.m ?? null}
        monthOptions={monthOptions}
      />

      {/* Главные цифры с индикатором изменения */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-5">
          <div className="text-xs text-neutral-500 uppercase tracking-wide mb-1">Выручка</div>
          <div className="text-2xl font-bold">{formatPrice(revenue.total)}</div>
          {previousRange && (
            <ChangeIndicator
              current={revenue.total}
              previous={revenuePrev.total}
              label="vs. прошлый"
            />
          )}
        </div>

        <div className="bg-white border border-neutral-200 rounded-xl p-5">
          <div className="text-xs text-neutral-500 uppercase tracking-wide mb-1">Счетов</div>
          <div className="text-2xl font-bold">{revenue.invoicesCount}</div>
          {previousRange && (
            <ChangeIndicator
              current={revenue.invoicesCount}
              previous={revenuePrev.invoicesCount}
              label="vs. прошлый"
            />
          )}
        </div>

        <div className="bg-white border border-neutral-200 rounded-xl p-5">
          <div className="text-xs text-neutral-500 uppercase tracking-wide mb-1">Средний чек</div>
          <div className="text-2xl font-bold">{formatPrice(revenue.avgCheck)}</div>
          {previousRange && (
            <ChangeIndicator
              current={revenue.avgCheck}
              previous={revenuePrev.avgCheck}
              label="vs. прошлый"
            />
          )}
        </div>

        <div className={`border rounded-xl p-5 ${
          ordersNoInvoice.length > 0
            ? 'bg-amber-50 border-amber-200'
            : 'bg-white border-neutral-200'
        }`}>
          <div className="text-xs text-neutral-500 uppercase tracking-wide mb-1">Без счёта</div>
          <div className={`text-2xl font-bold ${
            ordersNoInvoice.length > 0 ? 'text-amber-700' : ''
          }`}>
            {ordersNoInvoice.length}
          </div>
          {previousRange && (
            <ChangeIndicator
              current={ordersNoInvoice.length}
              previous={ordersNoInvoicePrev.length}
              higherIsBetter={false}
              label="vs. прошлый"
            />
          )}
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

      {/* Ожидают счёт */}
      {ordersNoInvoice.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-amber-900 flex items-center gap-2">
              ⚠️ Ожидают счёт
              <span className="text-amber-700">· {ordersNoInvoice.length}</span>
            </h2>
            <Link
              href="/orders?invoice=without"
              className="text-xs text-amber-700 hover:text-amber-900 font-medium"
            >
              Все →
            </Link>
          </div>

          <ul className="space-y-2">
            {ordersNoInvoice.slice(0, 10).map(o => (
              <li key={o.id}>
                <Link
                  href={`/orders/${o.id}`}
                  className="flex items-center justify-between gap-3 p-2 -mx-2 rounded hover:bg-amber-100/50"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="text-sm font-medium truncate">{o.client_name}</span>
                    <span className="text-xs text-neutral-500 truncate">· {o.service_title}</span>
                  </div>
                  <div className="text-right whitespace-nowrap">
                    <div className="text-sm font-semibold">{formatPrice(o.price)}</div>
                    <div className="text-xs text-neutral-500">
                      {new Date(o.created_at).toLocaleDateString('de-DE')}
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>

          {ordersNoInvoice.length > 10 && (
            <div className="text-xs text-amber-700 mt-3 text-center">
              Показано 10 из {ordersNoInvoice.length}.{' '}
              <Link href="/orders?invoice=without" className="underline">Открыть все</Link>
            </div>
          )}
        </div>
      )}

      {/* Топ-клиенты и топ-услуги */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
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
      <div className="text-xs text-neutral-500 bg-neutral-50 rounded-lg p-3 space-y-1">
        <div>💡 В «Выручку» входят только заказы с выставленным счётом (есть номер вида 2026-XXXX).</div>
        <div>📅 Все цифры считаются по <strong>дате выполнения работы</strong> (Leistungsdatum). Если она не указана — используется дата завершения заказа или дата создания.</div>
        <div>📊 Индикатор ↑/↓ — сравнение с предыдущим периодом такой же длины.</div>
      </div>
    </div>
  );
}