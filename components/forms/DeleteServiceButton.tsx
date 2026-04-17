'use client';

import { useState, useTransition } from 'react';
import { deleteServiceAction } from '@/app/(dashboard)/services/actions';

export default function DeleteServiceButton({ serviceId }: { serviceId: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleDelete() {
    if (!window.confirm('Удалить услугу? Это действие нельзя отменить.')) return;

    setError(null);
    startTransition(async () => {
      try {
        await deleteServiceAction(serviceId);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Неизвестная ошибка');
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
        {isPending ? 'Удаление...' : 'Удалить услугу'}
      </button>
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}