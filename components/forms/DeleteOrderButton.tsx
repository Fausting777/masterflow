'use client';

import { useState, useTransition } from 'react';
import { softDeleteOrderAction } from '@/app/(dashboard)/orders/actions';
import { useI18n } from '@/components/i18n/LocaleProvider';

export default function DeleteOrderButton({ orderId }: { orderId: string }) {
  const { locale } = useI18n();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const text =
    locale === 'de'
      ? {
          confirm: 'Auftrag in den Papierkorb verschieben? Er kann später wiederhergestellt werden.',
          genericError: 'Fehler',
          deleting: 'Wird verschoben...',
          delete: 'Auftrag in den Papierkorb',
        }
      : {
          confirm: 'Переместить заказ в корзину? Его потом можно будет восстановить.',
          genericError: 'Ошибка',
          deleting: 'Перемещение...',
          delete: 'Переместить заказ в корзину',
        };

  function handleDelete() {
    if (!window.confirm(text.confirm)) return;
    setError(null);
    startTransition(async () => {
      const result = await softDeleteOrderAction(orderId);
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
