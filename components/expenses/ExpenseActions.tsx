'use client';

import { useState, useTransition } from 'react';
import {
  softDeleteExpenseAction,
  restoreExpenseAction,
  permanentDeleteExpenseAction,
} from '@/app/(dashboard)/expenses/actions';

type Props = {
  expenseId: string;
  isDeleted: boolean;
};

export default function ExpenseActions({ expenseId, isDeleted }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSoftDelete() {
    if (!confirm('Переместить расход в корзину?')) return;
    setError(null);
    startTransition(async () => {
      try {
        await softDeleteExpenseAction(expenseId);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Ошибка');
      }
    });
  }

  function handleRestore() {
    setError(null);
    startTransition(async () => {
      try {
        await restoreExpenseAction(expenseId);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Ошибка');
      }
    });
  }

  function handlePermanentDelete() {
    setError(null);
    startTransition(async () => {
      try {
        await permanentDeleteExpenseAction(expenseId);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Ошибка');
      }
    });
  }

  if (isDeleted) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
        <div className="mb-3">
          <div className="font-medium text-amber-900">Расход в корзине</div>
          <div className="mt-0.5 text-xs text-amber-800">
            Расход можно восстановить, но окончательное удаление отключено из-за требований хранения бухгалтерских
            документов.
          </div>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleRestore}
            disabled={isPending}
            className="flex-1 rounded-lg border border-amber-300 bg-white py-2 text-sm font-medium text-amber-900 hover:bg-amber-100 disabled:opacity-50"
          >
            Восстановить
          </button>
          <button
            type="button"
            onClick={handlePermanentDelete}
            disabled={isPending}
            className="rounded-lg border border-amber-300 px-4 py-2 text-sm font-medium text-amber-900 hover:bg-amber-100 disabled:opacity-50"
          >
            Почему нельзя удалить
          </button>
        </div>

        {error && <p className="mt-2 text-xs text-red-700">{error}</p>}
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleSoftDelete}
        disabled={isPending}
        className="w-full rounded-lg border border-red-300 bg-red-50 py-2.5 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
      >
        Удалить расход в корзину
      </button>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
