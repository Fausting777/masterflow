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
          confirm: 'Kunden loeschen? Dieser Schritt kann nicht rueckgaengig gemacht werden.',
          deleting: 'Wird geloescht...',
          delete: 'Kunden loeschen',
          genericError: 'Unbekannter Fehler',
        }
      : {
          confirm:
            '\u0423\u0434\u0430\u043b\u0438\u0442\u044c \u043a\u043b\u0438\u0435\u043d\u0442\u0430? \u042d\u0442\u043e \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0435 \u043d\u0435\u043b\u044c\u0437\u044f \u043e\u0442\u043c\u0435\u043d\u0438\u0442\u044c.',
          deleting: '\u0423\u0434\u0430\u043b\u0435\u043d\u0438\u0435...',
          delete: '\u0423\u0434\u0430\u043b\u0438\u0442\u044c \u043a\u043b\u0438\u0435\u043d\u0442\u0430',
          genericError: '\u041d\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043d\u0430\u044f \u043e\u0448\u0438\u0431\u043a\u0430',
        };

  function handleDelete() {
    if (!window.confirm(text.confirm)) return;

    setError(null);
    startTransition(async () => {
      try {
        await deleteClientAction(clientId);
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
