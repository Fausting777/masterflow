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
    if (!confirm('Удалить окончательно? Это действие нельзя отменить. Чек тоже будет удалён.')) return;
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
      <div className="bg-red-50 border border-red-200 rounded-xl p-5">
        <div className="flex items-start gap-2 mb-3">
          <span className="text-xl">🗑</span>
          <div>
            <div className="font-medium text-red-900">Расход в корзине</div>
            <div className="text-xs text-red-700 mt-0.5">
              Нажми &quot;Восстановить&quot; чтобы вернуть его в список
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleRestore}
            disabled={isPending}
            className="flex-1 rounded-lg bg-white border border-red-300 text-red-700 hover:bg-red-100 font-medium py-2 text-sm disabled:opacity-50"
          >
            ↻ Восстановить
          </button>
          <button
            type="button"
            onClick={handlePermanentDelete}
            disabled={isPending}
            className="rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium px-4 py-2 text-sm disabled:opacity-50"
          >
            Удалить навсегда
          </button>
        </div>

        {error && <p className="text-xs text-red-700 mt-2">{error}</p>}
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleSoftDelete}
        disabled={isPending}
        className="w-full rounded-lg border border-red-300 bg-red-50 text-red-700 hover:bg-red-100 font-medium py-2.5 text-sm disabled:opacity-50"
      >
        🗑 Удалить расход (в корзину)
      </button>
      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
    </div>
  );
}