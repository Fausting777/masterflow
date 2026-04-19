import ExportExpensesButton from '@/components/expenses/ExportExpensesButton';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { formatPrice } from '@/lib/utils/format';
import {
  EXPENSE_CATEGORY_LABELS,
  EXPENSE_CATEGORY_EMOJIS,
  EXPENSE_CATEGORY_COLORS,
} from '@/lib/utils/format';
import { getRange, toDateOnly, type PeriodKey } from '@/lib/utils/date-range';
import { getExpensesSummary } from '@/lib/stats/expenses';
import type { Expense, ExpenseCategory } from '@/types/database';

type SearchParams = Promise<{
  period?: string;
  from?: string;
  to?: string;
  category?: string;
  q?: string;
}>;

const PERIOD_BUTTONS: Array<{ key: PeriodKey; label: string }> = [
  { key: 'month', label: 'Месяц' },
  { key: 'quarter', label: 'Квартал' },
  { key: 'year', label: 'Год' },
  { key: 'all', label: 'Всё' },
];

const CATEGORIES: ExpenseCategory[] = [
  'material',
  'fahrtkosten',
  'werkzeuge',
  'telefon_internet',
  'versicherung',
  'buero',
  'weiterbildung',
  'sonstiges',
];

export default async function ExpensesPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const activePeriod = (sp.period ?? 'month') as PeriodKey;
  const activeCategory = sp.category ?? 'all';
  const search = (sp.q ?? '').trim();

  // Диапазон дат
  const rangeOptions: { from?: Date; to?: Date } = {};
  if (activePeriod === 'custom' && sp.from && sp.to) {
    rangeOptions.from = new Date(sp.from + 'T00:00:00');
    rangeOptions.to = new Date(sp.to + 'T23:59:59');
  }
  const range = getRange(activePeriod, new Date(), rangeOptions);
  const fromDate = toDateOnly(range.from);
  const toDate = toDateOnly(range.to);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Параллельные запросы
  let listQuery = supabase
    .from('expenses')
    .select('*')
    .eq('user_id', user!.id)
    .is('deleted_at', null)
    .order('expense_date', { ascending: false })
    .order('created_at', { ascending: false });

  if (activePeriod !== 'all') {
    listQuery = listQuery
      .gte('expense_date', fromDate)
      .lte('expense_date', toDate);
  }

  if (activeCategory !== 'all') {
    listQuery = listQuery.eq('category', activeCategory);
  }

  const [summaryResult, listResult] = await Promise.all([
    getExpensesSummary(supabase, user!.id, fromDate, toDate),
    listQuery,
  ]);

  let expenses = (listResult.data ?? []) as Expense[];

  // Поиск локально по description и vendor
  if (search) {
    const q = search.toLowerCase();
    expenses = expenses.filter(e =>
      (e.description ?? '').toLowerCase().includes(q) ||
      (e.vendor ?? '').toLowerCase().includes(q)
    );
  }

  // Хелпер для ссылок
  function buildHref(params: { period?: string; category?: string }) {
    const sp2 = new URLSearchParams();
    const p = params.period ?? activePeriod;
    const c = params.category ?? activeCategory;
    if (p !== 'month') sp2.set('period', p);
    if (c !== 'all') sp2.set('category', c);
    if (search) sp2.set('q', search);
    return `/expenses${sp2.toString() ? `?${sp2}` : ''}`;
  }

  return (
    <div>
      {/* Шапка */}
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
  <h1 className="text-2xl font-semibold">Расходы</h1>
  <div className="flex items-center gap-2 flex-wrap">
    {activePeriod !== 'all' && (
      <ExportExpensesButton
        fromDate={fromDate}
        toDate={toDate}
        category={activeCategory}
      />
    )}
    <Link
      href="/expenses/trash"
      className="text-sm text-neutral-600 hover:text-neutral-900 px-3 py-2 rounded-lg hover:bg-neutral-100"
      title="Корзина"
    >
      🗑
    </Link>
    <Link
      href="/expenses/new"
      className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2"
    >
      + Новый
    </Link>
  </div>
</div>

      <p className="text-sm text-neutral-500 mb-4">{range.label}</p>

      {/* Фильтр периода */}
      <div className="flex flex-wrap gap-2 mb-3">
        {PERIOD_BUTTONS.map((p) => {
          const active = p.key === activePeriod;
          return (
            <Link
              key={p.key}
              href={buildHref({ period: p.key })}
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

      {/* Фильтр категории */}
      <div className="flex flex-wrap gap-2 mb-4">
        <Link
          href={buildHref({ category: 'all' })}
          className={`text-xs font-medium px-3 py-1 rounded-full transition ${
            activeCategory === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
          }`}
        >
          Все категории
        </Link>
        {CATEGORIES.map((cat) => {
          const active = cat === activeCategory;
          return (
            <Link
              key={cat}
              href={buildHref({ category: cat })}
              className={`text-xs font-medium px-3 py-1 rounded-full transition ${
                active
                  ? 'bg-blue-600 text-white'
                  : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
              }`}
            >
              {EXPENSE_CATEGORY_EMOJIS[cat]} {EXPENSE_CATEGORY_LABELS[cat]}
            </Link>
          );
        })}
      </div>

      {/* Поиск */}
      <form action="/expenses" className="mb-4">
        {activePeriod !== 'month' && (
          <input type="hidden" name="period" value={activePeriod} />
        )}
        {activeCategory !== 'all' && (
          <input type="hidden" name="category" value={activeCategory} />
        )}
        <input
          type="text"
          name="q"
          defaultValue={search}
          placeholder="Поиск по описанию или продавцу..."
          className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </form>

      {/* Итого за период */}
      <div className="bg-gradient-to-br from-rose-50 to-pink-50 border border-rose-200 rounded-xl p-5 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-neutral-500 uppercase tracking-wide">
              Всего за {range.label}
            </div>
            <div className="text-2xl font-bold text-rose-700 mt-1">
              {formatPrice(summaryResult.total)}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-neutral-500">Расходов: {summaryResult.count}</div>
            <div className="text-xs text-neutral-500 mt-1">
              Налог. вычет: <span className="font-semibold">{formatPrice(summaryResult.taxDeductible)}</span>
            </div>
          </div>
        </div>

        {/* Разбивка по категориям */}
        {summaryResult.total > 0 && (
          <div className="mt-3 pt-3 border-t border-rose-200 flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => {
              const amount = summaryResult.byCategory[cat];
              if (amount === 0) return null;
              const pct = Math.round((amount / summaryResult.total) * 100);
              return (
                <div key={cat} className="text-xs flex items-center gap-1">
                  <span>{EXPENSE_CATEGORY_EMOJIS[cat]}</span>
                  <span className="font-medium">{formatPrice(amount)}</span>
                  <span className="text-neutral-500">({pct}%)</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Список */}
      {expenses.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-300 p-8 text-center text-sm text-neutral-500">
          {search ? (
            <>Ничего не найдено по запросу «{search}»</>
          ) : activeCategory !== 'all' || activePeriod !== 'month' ? (
            <>Нет расходов по этому фильтру</>
          ) : (
            <>
              Пока нет расходов.{' '}
              <Link href="/expenses/new" className="text-blue-600 hover:underline">
                Добавить первый
              </Link>
            </>
          )}
        </div>
      ) : (
        <ul className="space-y-2">
          {expenses.map((e) => {
            const dateLabel = new Date(e.expense_date).toLocaleDateString('de-DE');
            return (
              <li key={e.id}>
                <Link
                  href={`/expenses/${e.id}`}
                  className="block bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 hover:border-blue-500 transition"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${EXPENSE_CATEGORY_COLORS[e.category]}`}>
                          {EXPENSE_CATEGORY_EMOJIS[e.category]} {EXPENSE_CATEGORY_LABELS[e.category]}
                        </span>
                        <span className="text-xs text-neutral-500">{dateLabel}</span>
                        {e.receipt_file_path && (
                          <span className="text-xs text-green-600" title="Есть чек">📎</span>
                        )}
                        {e.order_id && (
                          <span className="text-xs text-blue-600" title="Привязан к заказу">🔗</span>
                        )}
                        {!e.tax_deductible && (
                          <span className="text-xs text-neutral-500" title="Без налогового вычета">⊘</span>
                        )}
                      </div>
                      <h3 className="font-medium truncate">
                        {e.vendor ?? e.description ?? 'Без названия'}
                      </h3>
                      {e.vendor && e.description && (
                        <p className="text-sm text-neutral-500 truncate">{e.description}</p>
                      )}
                    </div>
                    <div className="text-right whitespace-nowrap">
                      <div className="font-semibold text-rose-700">{formatPrice(Number(e.amount))}</div>
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