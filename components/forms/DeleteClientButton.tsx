'use client';

import { useState, useTransition } from 'react';
import { deleteClientAction } from '@/app/(dashboard)/clients/actions';
import { useI18n } from '@/components/i18n/LocaleProvider';

export default function DeleteClientButton({ clientId }: { clientId: string }) {
  const { locale } = useI18n();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const text =
    locale === 'de'
      ? {
          confirm: 'Kunden löschen? Dieser Schritt kann nicht rückgängig gemacht werden.',
          deleting: 'Wird gelöscht...',
          delete: 'Kunden löschen',
          genericError: 'Unbekannter Fehler',
        }
      : {
          confirm: 'Удалить клиента? Это действие нельзя отменить.',
          deleting: 'Удаление...',
          delete: 'Удалить клиента',
          genericError: 'Неизвестная ошибка',
        };

  function handleDelete() {
    if (!window.confirm(text.confirm)) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteClientAction(clientId);
      if (!result.ok) setError(result.error ?? text.genericError);
    });
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleDelete}
        disabled={isPending}
        className="text-sm text-red-600 hover:text-red-700 disabled:text-red-400"
      >
        {isPending ? text.deleting : text.delete}
      </button>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
