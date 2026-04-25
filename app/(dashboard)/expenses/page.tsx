import Link from 'next/link';
import ExportExpensesButton from '@/components/expenses/ExportExpensesButton';
import PeriodPicker from '@/components/stats/PeriodPicker';
import { getDictionary } from '@/lib/i18n/server';
import { getExpensesSummary } from '@/lib/stats/expenses';
import { createClient } from '@/lib/supabase/server';
import { getMonthOptions, getRange, toDateOnly, type PeriodKey } from '@/lib/utils/date-range';
import {
  EXPENSE_CATEGORY_COLORS,
  formatDate,
  formatPrice,
  getExpenseCategoryEmoji,
  getExpenseCategoryLabel,
} from '@/lib/utils/format';
import type { Expense, ExpenseCategory } from '@/types/database';

type SearchParams = Promise<{
  period?: string;
  from?: string;
  to?: string;
  category?: string;
  q?: string;
}>;

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
  const { locale, t } = await getDictionary();
  const activePeriod = (sp.period ?? 'all') as PeriodKey;
  const activeCategory = sp.category ?? 'all';
  const search = (sp.q ?? '').trim();
  const currentMonth = activePeriod === 'month' ? sp.from ?? null : null;
  const monthOptions = getMonthOptions(2024, new Date(), locale);

  const periodButtons: Array<{ key: PeriodKey; label: string }> = [
    { key: 'month', label: t.expensesPage.month },
    { key: 'quarter', label: t.expensesPage.quarter },
    { key: 'year', label: t.expensesPage.year },
    { key: 'all', label: t.expensesPage.all },
  ];

  const rangeOptions: { from?: Date; to?: Date } = {};
  if (activePeriod === 'custom' && sp.from && sp.to) {
    rangeOptions.from = new Date(`${sp.from}T00:00:00`);
    rangeOptions.to = new Date(`${sp.to}T23:59:59`);
  }

  const range = getRange(activePeriod, new Date(), {
    ...rangeOptions,
    specificMonth: activePeriod === 'month' ? currentMonth ?? undefined : undefined,
    locale,
  });
  const fromDate = toDateOnly(range.from);
  const toDate = toDateOnly(range.to);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let listQuery = supabase
    .from('expenses')
    .select('*')
    .eq('user_id', user!.id)
    .is('deleted_at', null)
    .order('expense_date', { ascending: false })
    .order('created_at', { ascending: false });

  if (activePeriod !== 'all') {
    listQuery = listQuery.gte('expense_date', fromDate).lte('expense_date', toDate);
  }

  if (activeCategory !== 'all') {
    listQuery = listQuery.eq('category', activeCategory);
  }

  const [summaryResult, listResult] = await Promise.all([
    getExpensesSummary(supabase, user!.id, fromDate, toDate),
    listQuery,
  ]);

  let expenses = (listResult.data ?? []) as Expense[];

  if (search) {
    const q = search.toLowerCase();
    expenses = expenses.filter(
      (expense) =>
        (expense.description ?? '').toLowerCase().includes(q) ||
        (expense.vendor ?? '').toLowerCase().includes(q)
    );
  }

  function buildHref(params: {
    period?: string;
    category?: string;
    from?: string | null;
    to?: string | null;
  }) {
    const next = new URLSearchParams();
    const period = params.period ?? activePeriod;
    const category = params.category ?? activeCategory;
    const nextFrom = params.from === undefined ? sp.from ?? null : params.from;
    const nextTo = params.to === undefined ? sp.to ?? null : params.to;
    if (period !== 'all') next.set('period', period);
    if (category !== 'all') next.set('category', category);
    if (period === 'month' && nextFrom) next.set('from', nextFrom);
    if (period === 'custom' && nextFrom && nextTo) {
      next.set('from', nextFrom);
      next.set('to', nextTo);
    }
    if (search) next.set('q', search);
    return `/expenses${next.toString() ? `?${next}` : ''}`;
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{t.expensesPage.title}</h1>
        <div className="flex flex-wrap items-center gap-2">
          <ExportExpensesButton
            fromDate={activePeriod === 'all' ? null : fromDate}
            toDate={activePeriod === 'all' ? null : toDate}
            category={activeCategory}
            search={search || null}
          />
          <Link
            href="/expenses/trash"
            className="rounded-lg px-3 py-2 text-sm text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
            title={t.expensesPage.trash}
          >
            {t.expensesPage.trash}
          </Link>
          <Link
            href="/expenses/new"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            + {t.expensesPage.new}
          </Link>
        </div>
      </div>

      <p className="mb-4 text-sm text-neutral-500 dark:text-neutral-400">{range.label}</p>

      <div className="mb-3 flex flex-wrap gap-2">
        {periodButtons.map((period) => {
          const active = period.key === activePeriod;
          return (
            <Link
              key={period.key}
              href={buildHref({ period: period.key })}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                active ? 'bg-blue-600 text-white' : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700'
              }`}
            >
              {period.label}
            </Link>
          );
        })}
      </div>

      <PeriodPicker
        targetPath="/expenses"
        currentPeriod={activePeriod}
        currentFrom={activePeriod === 'custom' ? sp.from ?? null : null}
        currentTo={activePeriod === 'custom' ? sp.to ?? null : null}
        currentMonth={currentMonth}
        monthOptions={monthOptions}
        monthParam="from"
        persistentParams={{
          category: activeCategory !== 'all' ? activeCategory : null,
          q: search || null,
        }}
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <Link
          href={buildHref({ category: 'all' })}
          className={`rounded-full px-3 py-1 text-xs font-medium transition ${
            activeCategory === 'all' ? 'bg-blue-600 text-white' : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
          }`}
        >
          {t.expensesPage.allCategories}
        </Link>
        {CATEGORIES.map((category) => {
          const active = category === activeCategory;
          return (
            <Link
              key={category}
              href={buildHref({ category })}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                active ? 'bg-blue-600 text-white' : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700'
              }`}
            >
              {getExpenseCategoryEmoji(category)} {getExpenseCategoryLabel(category, locale)}
            </Link>
          );
        })}
      </div>

      <form action="/expenses" className="mb-4">
        {activePeriod !== 'all' && <input type="hidden" name="period" value={activePeriod} />}
        {activePeriod === 'month' && currentMonth && <input type="hidden" name="from" value={currentMonth} />}
        {activePeriod === 'custom' && sp.from && <input type="hidden" name="from" value={sp.from} />}
        {activePeriod === 'custom' && sp.to && <input type="hidden" name="to" value={sp.to} />}
        {activeCategory !== 'all' && <input type="hidden" name="category" value={activeCategory} />}
        <input
          type="text"
          name="q"
          defaultValue={search}
          placeholder={t.expensesPage.searchPlaceholder}
          className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-neutral-700 dark:bg-neutral-900"
        />
      </form>

      <div className="mb-4 rounded-xl border border-rose-200 bg-gradient-to-br from-rose-50 to-pink-50 p-5 dark:border-rose-900 dark:from-rose-950/30 dark:to-pink-950/30">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
              {t.expensesPage.rangeTotal} {range.label}
            </div>
            <div className="mt-1 text-2xl font-bold text-rose-700 dark:text-rose-400">{formatPrice(summaryResult.total)}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-neutral-500 dark:text-neutral-400">
              {t.expensesPage.expenseCount}: {summaryResult.count}
            </div>
            <div className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
              {t.expensesPage.taxDeductible}:{' '}
              <span className="font-semibold">{formatPrice(summaryResult.taxDeductible)}</span>
            </div>
          </div>
        </div>

        {summaryResult.total > 0 && (
          <div className="mt-3 flex flex-wrap gap-2 border-t border-rose-200 pt-3 dark:border-rose-900">
            {CATEGORIES.map((category) => {
              const amount = summaryResult.byCategory[category];
              if (amount === 0) return null;
              const pct = Math.round((amount / summaryResult.total) * 100);
              return (
                <div key={category} className="flex items-center gap-1 text-xs">
                  <span>{getExpenseCategoryEmoji(category)}</span>
                  <span className="font-medium">{formatPrice(amount)}</span>
                  <span className="text-neutral-500">({pct}%)</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {expenses.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-300 p-8 text-center text-sm text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">
          {search ? (
            <>
              {t.expensesPage.emptySearch} &quot;{search}&quot;
            </>
          ) : activeCategory !== 'all' || activePeriod !== 'all' ? (
            t.expensesPage.emptyFilter
          ) : (
            <>
              {t.expensesPage.emptyDefault}{' '}
              <Link href="/expenses/new" className="text-blue-600 hover:underline">
                {t.expensesPage.addFirst}
              </Link>
            </>
          )}
        </div>
      ) : (
        <ul className="space-y-2">
          {expenses.map((expense) => (
            <li key={expense.id}>
              <Link
                href={`/expenses/${expense.id}`}
                className="block rounded-xl border border-neutral-200 bg-white p-4 transition duration-200 hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98] dark:border-neutral-800 dark:bg-neutral-900"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${EXPENSE_CATEGORY_COLORS[expense.category]}`}
                      >
                        {getExpenseCategoryEmoji(expense.category)}{' '}
                        {getExpenseCategoryLabel(expense.category, locale)}
                      </span>
                      <span className="text-xs text-neutral-500 dark:text-neutral-400">
                        {formatDate(expense.expense_date, locale)}
                      </span>
                      {expense.receipt_file_path && (
                        <span className="text-xs text-green-600 dark:text-green-400" title={t.expensesPage.receiptTitle}>
                          {t.expensesPage.receiptTitle}
                        </span>
                      )}
                      {expense.order_id && (
                        <span className="text-xs text-blue-600 dark:text-blue-400" title={t.expensesPage.linkedOrderTitle}>
                          {t.expensesPage.linkedOrderTitle}
                        </span>
                      )}
                      {!expense.tax_deductible && (
                        <span className="text-xs text-neutral-500 dark:text-neutral-400" title={t.expensesPage.noDeductionTitle}>
                          {t.expensesPage.noDeductionTitle}
                        </span>
                      )}
                    </div>
                    <h3 className="truncate font-medium">
                      {expense.vendor ?? expense.description ?? t.expensesPage.untitled}
                    </h3>
                    {expense.vendor && expense.description && (
                      <p className="truncate text-sm text-neutral-500 dark:text-neutral-400">{expense.description}</p>
                    )}
                  </div>
                  <div className="whitespace-nowrap text-right">
                    <div className="font-semibold text-rose-700 dark:text-rose-400">{formatPrice(Number(expense.amount))}</div>
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
