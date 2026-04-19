import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import {
  formatPrice,
  EXPENSE_CATEGORY_LABELS,
  EXPENSE_CATEGORY_EMOJIS,
  EXPENSE_CATEGORY_COLORS,
} from '@/lib/utils/format';
import type { Expense } from '@/types/database';

export default async function ExpensesTrashPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

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
          ← К расходам
        </Link>
      </div>

      <h1 className="text-2xl font-semibold mb-1">🗑 Корзина расходов</h1>
      <p className="text-sm text-neutral-500 mb-4">
        Удалённые расходы. Можно восстановить или удалить окончательно.
      </p>

      {expenses.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-300 p-8 text-center text-sm text-neutral-500">
          Корзина пуста
        </div>
      ) : (
        <ul className="space-y-2">
          {expenses.map((e) => {
            const dateLabel = new Date(e.expense_date).toLocaleDateString('de-DE');
            const deletedLabel = e.deleted_at
              ? new Date(e.deleted_at).toLocaleString('de-DE')
              : '';
            return (
              <li key={e.id}>
                <Link
                  href={`/expenses/${e.id}`}
                  className="block bg-white border border-neutral-200 rounded-xl p-4 hover:border-red-500 transition opacity-75 hover:opacity-100"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${EXPENSE_CATEGORY_COLORS[e.category]}`}>
                          {EXPENSE_CATEGORY_EMOJIS[e.category]} {EXPENSE_CATEGORY_LABELS[e.category]}
                        </span>
                        <span className="text-xs text-neutral-500">{dateLabel}</span>
                      </div>
                      <h3 className="font-medium truncate">
                        {e.vendor ?? e.description ?? 'Без названия'}
                      </h3>
                      <div className="text-xs text-red-700 mt-1">
                        Удалён: {deletedLabel}
                      </div>
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