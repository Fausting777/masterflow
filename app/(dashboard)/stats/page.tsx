import Link from 'next/link';
import ChangeIndicator from '@/components/stats/ChangeIndicator';
import PeriodPicker from '@/components/stats/PeriodPicker';
import RevenueChart from '@/components/stats/RevenueChart';
import { createClient } from '@/lib/supabase/server';
import { getLocale } from '@/lib/i18n/server';
import {
  getLastMonths,
  getMonthOptions,
  getPreviousRange,
  getRange,
  toDateOnly,
  type PeriodKey,
} from '@/lib/utils/date-range';
import { getExpensesSummary, getMonthlyExpenses } from '@/lib/stats/expenses';
import {
  getMonthlyRevenue,
  getOrdersWithoutInvoice,
  getRevenueStats,
  getTopClients,
  getTopServices,
} from '@/lib/stats/calculate';
import {
  formatPrice,
  getExpenseCategoryEmoji,
  getExpenseCategoryLabel,
} from '@/lib/utils/format';
import type { ExpenseCategory } from '@/types/database';

type SearchParams = Promise<{
  period?: string;
  from?: string;
  to?: string;
  m?: string;
}>;

const DASH = '—';

export default async function StatsPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const locale = await getLocale();
  const activePeriod = (sp.period ?? 'month') as PeriodKey;

  const text =
    locale === 'de'
      ? {
          back: 'Zurueck zum Dashboard',
          title: 'Statistik',
          previous: 'vs. vorher',
          revenue: 'Umsatz',
          invoices: 'Quittungen',
          avgCheck: 'Durchschnitt',
          withoutInvoice: 'Ohne Quittung',
          income: 'Einnahmen',
          expenses: 'Ausgaben',
          deductible: 'Davon absetzbar',
          profit: 'Gewinn',
          loss: 'Verlust',
          monthlyChart: 'Einnahmen und Ausgaben pro Monat',
          byCategory: 'Ausgaben nach Kategorien',
          details: 'Mehr',
          pendingInvoices: 'Offene Quittungen',
          all: 'Alle',
          showAll: 'Alle anzeigen',
          topClients: 'Top-Kunden',
          byRevenue: 'nach Umsatz',
          noData: 'Keine Daten',
          topServices: 'Top-Leistungen',
          byFrequency: 'nach Haeufigkeit',
          jobs: 'Jobs',
          notes1: 'Im Umsatz zaehlen nur Auftraege mit ausgestellter Quittung.',
          notes2:
            'Alle Kennzahlen beziehen sich primaer auf das Leistungsdatum. Wenn es fehlt, wird das Erstellungsdatum des Auftrags verwendet.',
          notes3: 'Der Indikator vergleicht mit dem vorherigen passenden Zeitraum.',
          of: 'von',
          showing: 'Es werden 10',
        }
      : {
          back: 'Назад к дашборду',
          title: 'Статистика',
          previous: 'vs. предыдущий',
          revenue: 'Выручка',
          invoices: 'Квитанции',
          avgCheck: 'Средний чек',
          withoutInvoice: 'Без квитанции',
          income: 'Доход',
          expenses: 'Расходы',
          deductible: 'Из них к вычету',
          profit: 'Прибыль',
          loss: 'Убыток',
          monthlyChart: 'Доходы и расходы по месяцам',
          byCategory: 'Расходы по категориям',
          details: 'Подробнее',
          pendingInvoices: 'Ждут квитанцию',
          all: 'Все',
          showAll: 'Открыть все',
          topClients: 'Топ клиентов',
          byRevenue: 'по выручке',
          noData: 'Нет данных',
          topServices: 'Топ услуг',
          byFrequency: 'по частоте',
          jobs: 'заказов',
          notes1: 'В выручке учитываются только заказы с выпущенной квитанцией.',
          notes2:
            'Все цифры считаются по дате выполнения работы. Если ее нет, берется дата создания заказа.',
          notes3: 'Индикатор сравнивает с предыдущим подходящим периодом.',
          of: 'из',
          showing: 'Показано 10',
        };

  const formatDate = (value: string | null | undefined) => {
    if (!value) return DASH;
    return new Intl.DateTimeFormat(locale === 'de' ? 'de-DE' : 'ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(value));
  };

  const rangeOptions: { from?: Date; to?: Date; specificMonth?: string } = {};
  if (activePeriod === 'custom' && sp.from && sp.to) {
    rangeOptions.from = new Date(`${sp.from}T00:00:00`);
    rangeOptions.to = new Date(`${sp.to}T23:59:59`);
  }
  if (activePeriod === 'month' && sp.m) {
    rangeOptions.specificMonth = sp.m;
  }

  const range = getRange(activePeriod, new Date(), { ...rangeOptions, locale });
  const previousRange = activePeriod === 'all' ? null : getPreviousRange(range, locale);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const months12 = getLastMonths(12, new Date(), locale);
  const monthOptions = getMonthOptions(2024, new Date(), locale);

  const fromDate = toDateOnly(range.from);
  const toDate = toDateOnly(range.to);
  const prevFromDate = previousRange ? toDateOnly(previousRange.from) : fromDate;
  const prevToDate = previousRange ? toDateOnly(previousRange.to) : toDate;

  const [
    revenue,
    monthly,
    topClients,
    topServices,
    ordersNoInvoice,
    revenuePrev,
    ordersNoInvoicePrev,
    expenses,
    expensesPrev,
    monthlyExpenses,
  ] = await Promise.all([
    getRevenueStats(supabase, user!.id, range.from, range.to),
    getMonthlyRevenue(supabase, user!.id, months12.map((m) => ({ from: m.from, to: m.to }))),
    getTopClients(supabase, user!.id, range.from, range.to),
    getTopServices(supabase, user!.id, range.from, range.to),
    getOrdersWithoutInvoice(supabase, user!.id, range.from, range.to),
    previousRange
      ? getRevenueStats(supabase, user!.id, previousRange.from, previousRange.to)
      : Promise.resolve({ total: 0, invoicesCount: 0, avgCheck: 0 }),
    previousRange
      ? getOrdersWithoutInvoice(supabase, user!.id, previousRange.from, previousRange.to)
      : Promise.resolve([]),
    getExpensesSummary(supabase, user!.id, fromDate, toDate),
    previousRange
      ? getExpensesSummary(supabase, user!.id, prevFromDate, prevToDate)
      : Promise.resolve({
          total: 0,
          taxDeductible: 0,
          count: 0,
          byCategory: {} as Record<ExpenseCategory, number>,
        }),
    getMonthlyExpenses(supabase, user!.id, months12.map((m) => ({ from: m.from, to: m.to }))),
  ]);

  const profit = revenue.total - expenses.total;
  const profitPrev = revenuePrev.total - expensesPrev.total;

  return (
    <div>
      <div className="mb-4">
        <Link href="/dashboard" className="text-sm text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-300">
          ← {text.back}
        </Link>
      </div>

      <h1 className="mb-1 text-2xl font-semibold">{text.title}</h1>
      <p className="mb-4 text-sm text-neutral-500 dark:text-neutral-400">{range.label}</p>

      <PeriodPicker
        currentPeriod={activePeriod}
        currentFrom={sp.from ?? null}
        currentTo={sp.to ?? null}
        currentMonth={sp.m ?? null}
        monthOptions={monthOptions}
      />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-5 dark:border-blue-900 dark:from-blue-950/30 dark:to-indigo-950/30">
          <div className="mb-1 text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">{text.revenue}</div>
          <div className="text-2xl font-bold">{formatPrice(revenue.total)}</div>
          {previousRange && (
            <ChangeIndicator current={revenue.total} previous={revenuePrev.total} label={text.previous} />
          )}
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
          <div className="mb-1 text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">{text.invoices}</div>
          <div className="text-2xl font-bold">{revenue.invoicesCount}</div>
          {previousRange && (
            <ChangeIndicator
              current={revenue.invoicesCount}
              previous={revenuePrev.invoicesCount}
              label={text.previous}
            />
          )}
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
          <div className="mb-1 text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">{text.avgCheck}</div>
          <div className="text-2xl font-bold">{formatPrice(revenue.avgCheck)}</div>
          {previousRange && (
            <ChangeIndicator current={revenue.avgCheck} previous={revenuePrev.avgCheck} label={text.previous} />
          )}
        </div>

        <div
          className={`rounded-xl border p-5 ${
            ordersNoInvoice.length > 0 ? 'border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30' : 'border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900'
          }`}
        >
          <div className="mb-1 text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">{text.withoutInvoice}</div>
          <div className={`text-2xl font-bold ${ordersNoInvoice.length > 0 ? 'text-amber-700 dark:text-amber-300' : ''}`}>
            {ordersNoInvoice.length}
          </div>
          {previousRange && (
            <ChangeIndicator
              current={ordersNoInvoice.length}
              previous={ordersNoInvoicePrev.length}
              higherIsBetter={false}
              label={text.previous}
            />
          )}
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 p-5 dark:border-green-900 dark:from-green-950/30 dark:to-emerald-950/30">
          <div className="mb-1 text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">{text.income}</div>
          <div className="text-2xl font-bold text-green-700 dark:text-green-400">{formatPrice(revenue.total)}</div>
          {previousRange && <ChangeIndicator current={revenue.total} previous={revenuePrev.total} label={text.previous} />}
        </div>

        <div className="rounded-xl border border-rose-200 bg-gradient-to-br from-rose-50 to-pink-50 p-5 dark:border-rose-900 dark:from-rose-950/30 dark:to-pink-950/30">
          <div className="mb-1 text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">{text.expenses}</div>
          <div className="text-2xl font-bold text-rose-700 dark:text-rose-400">{formatPrice(expenses.total)}</div>
          <div className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
            {text.deductible}: <span className="font-semibold">{formatPrice(expenses.taxDeductible)}</span>
          </div>
          {previousRange && (
            <ChangeIndicator
              current={expenses.total}
              previous={expensesPrev.total}
              higherIsBetter={false}
              label={text.previous}
            />
          )}
        </div>

        <div
          className={`rounded-xl border p-5 ${
            profit >= 0
              ? 'border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 dark:border-blue-900 dark:from-blue-950/30 dark:to-indigo-950/30'
              : 'border-orange-200 bg-gradient-to-br from-orange-50 to-red-50 dark:border-orange-900 dark:from-orange-950/30 dark:to-red-950/30'
          }`}
        >
          <div className="mb-1 text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">{profit >= 0 ? text.profit : text.loss}</div>
          <div className={`text-2xl font-bold ${profit >= 0 ? 'text-blue-700 dark:text-blue-400' : 'text-orange-700 dark:text-orange-400'}`}>
            {formatPrice(Math.abs(profit))}
          </div>
          {previousRange && <ChangeIndicator current={profit} previous={profitPrev} label={text.previous} />}
        </div>
      </div>

      <div className="mb-6 rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
        <h2 className="mb-1 text-sm font-medium text-neutral-500 dark:text-neutral-400">{text.monthlyChart}</h2>
        <RevenueChart
          months={months12.map((month) => ({ label: month.label, fullLabel: month.fullLabel }))}
          values={monthly}
          expenses={monthlyExpenses}
        />
      </div>

      {expenses.total > 0 && (
        <div className="mb-6 rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
              {text.byCategory} <span className="text-neutral-400 dark:text-neutral-500">· {formatPrice(expenses.total)}</span>
            </h2>
            <Link href="/expenses" className="text-xs font-medium text-blue-700 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300">
              {text.details} →
            </Link>
          </div>

          <div className="space-y-2">
            {(Object.entries(expenses.byCategory) as Array<[ExpenseCategory, number]>)
              .filter(([, amount]) => amount > 0)
              .sort(([, a], [, b]) => b - a)
              .map(([category, amount]) => {
                const pct = expenses.total > 0 ? (amount / expenses.total) * 100 : 0;
                return (
                  <div key={category}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="flex items-center gap-1">
                        <span>{getExpenseCategoryEmoji(category)}</span>
                        <span className="text-neutral-700 dark:text-neutral-300">{getExpenseCategoryLabel(category, locale)}</span>
                      </span>
                      <span className="font-semibold">
                        {formatPrice(amount)} <span className="text-xs font-normal text-neutral-500">({Math.round(pct)}%)</span>
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                      <div className="h-full rounded-full bg-rose-400 transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {ordersNoInvoice.length > 0 && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-900 dark:bg-amber-950/30">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-medium text-amber-900 dark:text-amber-300">
              {text.pendingInvoices}
              <span className="text-amber-700 dark:text-amber-400">· {ordersNoInvoice.length}</span>
            </h2>
            <Link href="/orders?invoice=without" className="text-xs font-medium text-amber-700 hover:text-amber-900 dark:text-amber-400 dark:hover:text-amber-300">
              {text.all} →
            </Link>
          </div>

          <ul className="space-y-2">
            {ordersNoInvoice.slice(0, 10).map((order) => (
              <li key={order.id}>
                <Link
                  href={`/orders/${order.id}`}
                  className="-mx-2 flex items-center justify-between gap-3 rounded p-2 hover:bg-amber-100/50 dark:hover:bg-amber-900/20"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{order.client_name}</div>
                    <div className="truncate text-xs text-neutral-500 dark:text-neutral-400">{order.service_title}</div>
                  </div>
                  <div className="whitespace-nowrap text-right">
                    <div className="text-sm font-semibold">{formatPrice(order.price)}</div>
                    <div className="text-xs text-neutral-500 dark:text-neutral-400">{formatDate(order.created_at)}</div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>

          {ordersNoInvoice.length > 10 && (
            <div className="mt-3 text-center text-xs text-amber-700">
              {text.showing} {text.of} {ordersNoInvoice.length}.{' '}
              <Link href="/orders?invoice=without" className="underline">
                {text.showAll}
              </Link>
            </div>
          )}
        </div>
      )}

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
          <h2 className="mb-3 text-sm font-medium text-neutral-500 dark:text-neutral-400">
            {text.topClients} <span className="text-neutral-400">{text.byRevenue}</span>
          </h2>
          {topClients.length === 0 ? (
            <p className="text-sm italic text-neutral-400">{text.noData}</p>
          ) : (
            <ul className="space-y-2">
              {topClients.map((client, index) => (
                <li key={client.clientId}>
                  <Link
                    href={`/clients/${client.clientId}`}
                    className="-mx-2 flex items-center justify-between gap-3 rounded p-2 hover:bg-neutral-50 dark:hover:bg-neutral-800"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="w-5 text-center font-mono text-xs text-neutral-400 dark:text-neutral-500">{index + 1}.</span>
                      <span className="truncate text-sm">{client.name}</span>
                    </div>
                    <div className="whitespace-nowrap text-right">
                      <div className="text-sm font-semibold">{formatPrice(client.total)}</div>
                      <div className="text-xs text-neutral-500">
                        {client.count} {text.jobs}
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
          <h2 className="mb-3 text-sm font-medium text-neutral-500 dark:text-neutral-400">
            {text.topServices} <span className="text-neutral-400">{text.byFrequency}</span>
          </h2>
          {topServices.length === 0 ? (
            <p className="text-sm italic text-neutral-400">{text.noData}</p>
          ) : (
            <ul className="space-y-2">
              {topServices.map((service, index) => (
                <li key={`${index}-${service.title}`} className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="w-5 text-center font-mono text-xs text-neutral-400">{index + 1}.</span>
                    <span className="truncate text-sm">{service.title}</span>
                  </div>
                  <span className="whitespace-nowrap text-sm font-semibold">{service.count}×</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="space-y-1 rounded-lg bg-neutral-50 p-3 text-xs text-neutral-500 dark:bg-neutral-900 dark:text-neutral-400">
        <div>{text.notes1}</div>
        <div>{text.notes2}</div>
        <div>{text.notes3}</div>
      </div>
    </div>
  );
}
