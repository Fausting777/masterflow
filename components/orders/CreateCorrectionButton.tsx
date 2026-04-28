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
          confirm: 'Soll ein separater Korrekturentwurf zu dieser Rechnung erstellt werden?',
          genericError: 'Fehler',
          creating: 'Wird erstellt...',
          create: 'Korrektur erstellen',
        }
      : {
          confirm: 'Создать отдельную корректировку для этого счёта?',
          genericError: 'Ошибка',
          creating: 'Создание...',
          create: 'Создать корректировку',
        };

  function handleClick() {
    if (!window.confirm(text.confirm)) return;
    setError(null);
    startTransition(async () => {
      const result = await createCorrectionDraftAction(orderId);
      if (!result.ok) setError(result.error ?? text.genericError);
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
