'use client';

import { useState, useTransition } from 'react';
import { deleteServiceAction } from '@/app/(dashboard)/services/actions';
import { useI18n } from '@/components/i18n/LocaleProvider';

export default function DeleteServiceButton({ serviceId }: { serviceId: string }) {
  const { locale } = useI18n();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const text =
    locale === 'de'
      ? {
          confirm: 'Leistung löschen? Dieser Schritt kann nicht rückgängig gemacht werden.',
          deleting: 'Wird gelöscht...',
          delete: 'Leistung löschen',
          genericError: 'Unbekannter Fehler',
        }
      : {
          confirm: 'Удалить услугу? Это действие нельзя отменить.',
          deleting: 'Удаление...',
          delete: 'Удалить услугу',
          genericError: 'Неизвестная ошибка',
        };

  function handleDelete() {
    if (!window.confirm(text.confirm)) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteServiceAction(serviceId);
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
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}
