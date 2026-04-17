'use client';

import { useState, useTransition } from 'react';
import { deleteClientAction } from '@/app/(dashboard)/clients/actions';

export default function DeleteClientButton({ clientId }: { clientId: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleDelete() {
    const confirmed = window.confirm(
      'Удалить клиента? Это действие нельзя отменить.'
    );
    if (!confirmed) return;

    setError(null);
    startTransition(async () => {
      try {
        await deleteClientAction(clientId);
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
        {isPending ? 'Удаление...' : 'Удалить клиента'}
      </button>
      {error && (
        <p className="text-xs text-red-600 mt-1">{error}</p>
      )}
    </div>
  );
}