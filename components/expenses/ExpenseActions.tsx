'use client';

import { useState, useTransition } from 'react';
import { permanentDeleteExpenseAction, restoreExpenseAction, softDeleteExpenseAction } from '@/app/(dashboard)/expenses/actions';
import { useI18n } from '@/components/i18n/LocaleProvider';

type Props = {
  expenseId: string;
  isDeleted: boolean;
};

export default function ExpenseActions({ expenseId, isDeleted }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const { t, locale } = useI18n();
  const deleteForeverLabel = locale === 'de' ? 'Endgueltig loeschen' : 'Удалить навсегда';
  const confirmDeleteForever =
    locale === 'de'
      ? 'Soll diese Ausgabe endgueltig geloescht werden?'
      : 'Удалить этот расход навсегда?';
  const deleteNowHelp =
    locale === 'de'
      ? 'Loescht die Ausgabe sofort inklusive gespeichertem Beleg.'
      : 'Удаляет расход сразу, вместе с сохраненным чеком.';

  function isRouterError(e: unknown): boolean {
    return e instanceof Error && 'digest' in e;
  }

  function handleSoftDelete() {
    if (!confirm(t.expenseActions.confirmTrash)) return;
    setError(null);
    startTransition(async () => {
      try {
        await softDeleteExpenseAction(expenseId);
      } catch (e) {
        if (isRouterError(e)) throw e;
        setError(e instanceof Error ? e.message : t.expenseActions.genericError);
      }
    });
  }

  function handleRestore() {
    setError(null);
    startTransition(async () => {
      try {
        await restoreExpenseAction(expenseId);
      } catch (e) {
        if (isRouterError(e)) throw e;
        setError(e instanceof Error ? e.message : t.expenseActions.genericError);
      }
    });
  }

  function handlePermanentDelete() {
    if (!confirm(confirmDeleteForever)) return;
    setError(null);
    startTransition(async () => {
      try {
        await permanentDeleteExpenseAction(expenseId);
      } catch (e) {
        if (isRouterError(e)) throw e;
        setError(e instanceof Error ? e.message : t.expenseActions.genericError);
      }
    });
  }

  if (isDeleted) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
        <div className="mb-3 space-y-1">
          <div className="font-medium text-amber-900">{t.expenseActions.deletedTitle}</div>
          <div className="text-xs text-amber-800">{t.expenseActions.deletedText}</div>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleRestore}
            disabled={isPending}
            className="flex-1 rounded-lg border border-amber-300 bg-white py-2 text-sm font-medium text-amber-900 hover:bg-amber-100 disabled:opacity-50"
          >
            {t.expenseActions.restore}
          </button>
          <button
            type="button"
            onClick={handlePermanentDelete}
            disabled={isPending}
            className="rounded-lg border border-amber-300 px-4 py-2 text-sm font-medium text-amber-900 hover:bg-amber-100 disabled:opacity-50"
          >
            {deleteForeverLabel}
          </button>
        </div>

        {error && <p className="mt-2 text-xs text-red-700">{error}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={handleSoftDelete}
          disabled={isPending}
          className="w-full rounded-lg border border-amber-300 bg-amber-50 py-2.5 text-sm font-medium text-amber-800 hover:bg-amber-100 disabled:opacity-50"
        >
          {t.expenseActions.softDelete}
        </button>
        <button
          type="button"
          onClick={handlePermanentDelete}
          disabled={isPending}
          className="w-full rounded-lg border border-red-300 bg-red-50 py-2.5 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
        >
          {deleteForeverLabel}
        </button>
      </div>
      <p className="text-xs text-neutral-500">{t.expenseActions.softDeleteHelp}</p>
      <p className="text-xs text-neutral-500">{deleteNowHelp}</p>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
