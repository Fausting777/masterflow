import Link from 'next/link';
import { getDictionary } from '@/lib/i18n/server';
import { createClient } from '@/lib/supabase/server';
import {
  EXPENSE_CATEGORY_COLORS,
  formatDate,
  formatDateTime,
  formatPrice,
  getExpenseCategoryEmoji,
  getExpenseCategoryLabel,
} from '@/lib/utils/format';
import type { Expense } from '@/types/database';

export default async function ExpensesTrashPage() {
  const supabase = await createClient();
  const { locale, t } = await getDictionary();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data } = await supabase
    .from('expenses')
    .select('*')
    .eq('user_id', user!.id)
    .not('deleted_at', 'is', null)
    .order('deleted_at', { ascending: false });

  const expenses = (data ?? []) as Expense[];

  return (
    <div>
      <div className="mb-4">
        <Link href="/expenses" className="text-sm text-neutral-500 hover:text-neutral-700">
          ← {t.expensesPage.detailsBack}
        </Link>
      </div>

      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t.expensesPage.trashTitle}</h1>
        <span className="text-sm text-neutral-500">
          {expenses.length} {t.expensesPage.countSuffix}
        </span>
      </div>

      <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
        <strong>{t.expensesPage.trashInfoTitle}:</strong> {t.expensesPage.trashInfo}
      </div>

      {expenses.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-300 p-8 text-center text-sm text-neutral-500">
          {t.expensesPage.trashEmpty}
        </div>
      ) : (
        <ul className="space-y-2">
          {expenses.map((expense) => (
            <li key={expense.id}>
              <Link
                href={`/expenses/${expense.id}`}
                className="block rounded-xl border border-neutral-200 bg-white p-4 transition hover:border-amber-500"
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
                      <span className="text-xs text-neutral-500">
                        {formatDate(expense.expense_date, locale)}
                      </span>
                    </div>
                    <h3 className="truncate font-medium">
                      {expense.vendor ?? expense.description ?? t.expensesPage.untitled}
                    </h3>
                    <div className="mt-1 text-xs text-neutral-500">
                      {t.expensesPage.hiddenAt}: {formatDateTime(expense.deleted_at, locale)}
                    </div>
                    {expense.receipt_file_path && (
                      <div className="mt-1 text-xs text-amber-700">{t.expensesPage.receiptArchived}</div>
                    )}
                  </div>
                  <div className="whitespace-nowrap text-right">
                    <div className="font-semibold text-rose-700">{formatPrice(Number(expense.amount))}</div>
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
