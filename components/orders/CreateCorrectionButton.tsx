'use client';

import { useState, useTransition } from 'react';
import { createCorrectionDraftAction } from '@/app/(dashboard)/orders/actions';
import { useI18n } from '@/components/i18n/LocaleProvider';

export default function CreateCorrectionButton({ orderId }: { orderId: string }) {
  const { locale } = useI18n();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const text =
    locale === 'de'
      ? {
          confirm:
            'Soll ein separater Korrekturentwurf zu dieser Quittung erstellt werden?',
          genericError: 'Fehler',
          creating: 'Wird erstellt...',
          create: 'Korrektur erstellen',
        }
      : {
          confirm:
            '\u0421\u043e\u0437\u0434\u0430\u0442\u044c \u043e\u0442\u0434\u0435\u043b\u044c\u043d\u0443\u044e \u043a\u043e\u0440\u0440\u0435\u043a\u0442\u0438\u0440\u043e\u0432\u043a\u0443 \u0434\u043b\u044f \u044d\u0442\u043e\u0439 \u043a\u0432\u0438\u0442\u0430\u043d\u0446\u0438\u0438?',
          genericError: '\u041e\u0448\u0438\u0431\u043a\u0430',
          creating: '\u0421\u043e\u0437\u0434\u0430\u043d\u0438\u0435...',
          create:
            '\u0421\u043e\u0437\u0434\u0430\u0442\u044c \u043a\u043e\u0440\u0440\u0435\u043a\u0442\u0438\u0440\u043e\u0432\u043a\u0443',
        };

  function handleClick() {
    if (!window.confirm(text.confirm)) return;
    setError(null);
    startTransition(async () => {
      try {
        await createCorrectionDraftAction(orderId);
      } catch (e) {
        setError(e instanceof Error ? e.message : text.genericError);
      }
    });
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-900 hover:bg-amber-100 disabled:opacity-60"
      >
        {isPending ? text.creating : text.create}
      </button>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
