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
          confirm:
            'Auftrag in den Papierkorb verschieben? Er kann später wiederhergestellt werden.',
          genericError: 'Fehler',
          deleting: 'Wird verschoben...',
          delete: 'Auftrag in den Papierkorb',
        }
      : {
          confirm:
            '\u041f\u0435\u0440\u0435\u043c\u0435\u0441\u0442\u0438\u0442\u044c \u0437\u0430\u043a\u0430\u0437 \u0432 \u043a\u043e\u0440\u0437\u0438\u043d\u0443? \u0415\u0433\u043e \u043f\u043e\u0442\u043e\u043c \u043c\u043e\u0436\u043d\u043e \u0431\u0443\u0434\u0435\u0442 \u0432\u043e\u0441\u0441\u0442\u0430\u043d\u043e\u0432\u0438\u0442\u044c.',
          genericError: '\u041e\u0448\u0438\u0431\u043a\u0430',
          deleting:
            '\u041f\u0435\u0440\u0435\u043c\u0435\u0449\u0435\u043d\u0438\u0435...',
          delete:
            '\u041f\u0435\u0440\u0435\u043c\u0435\u0441\u0442\u0438\u0442\u044c \u0437\u0430\u043a\u0430\u0437 \u0432 \u043a\u043e\u0440\u0437\u0438\u043d\u0443',
        };

  function handleDelete() {
    if (!window.confirm(text.confirm)) return;
    setError(null);
    startTransition(async () => {
      try {
        await softDeleteOrderAction(orderId);
      } catch (e) {
        setError(e instanceof Error ? e.message : text.genericError);
      }
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
