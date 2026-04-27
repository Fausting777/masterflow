'use client';

import { useState, useTransition } from 'react';
import { deleteAccountAction } from '@/app/(dashboard)/settings/delete-account-action';
import { useI18n } from '@/components/i18n/LocaleProvider';

export default function DeleteAccountButton() {
  const { locale } = useI18n();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const text = locale === 'de'
    ? {
        label: 'Konto löschen',
        confirm: 'Konto wirklich löschen?\n\nAlle Daten werden unwiderruflich entfernt.',
        loading: 'Wird gelöscht...',
      }
    : {
        label: 'Удалить аккаунт',
        confirm: 'Удалить аккаунт?\n\nВсе данные будут безвозвратно удалены.',
        loading: 'Удаление...',
      };

  function handleDelete() {
    if (!window.confirm(text.confirm)) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteAccountAction();
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={handleDelete}
        disabled={isPending}
        className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/30"
      >
        {isPending ? text.loading : text.label}
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
