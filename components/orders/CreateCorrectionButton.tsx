'use client';

import { createCorrectionDraftAction } from '@/app/(dashboard)/orders/actions';
import { useState, useTransition } from 'react';

export default function CreateCorrectionButton({ orderId }: { orderId: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    if (!window.confirm('Создать отдельную корректировку для этого счета?')) return;
    setError(null);
    startTransition(async () => {
      try {
        await createCorrectionDraftAction(orderId);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Ошибка');
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
        {isPending ? 'Создание...' : 'Создать корректировку'}
      </button>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
