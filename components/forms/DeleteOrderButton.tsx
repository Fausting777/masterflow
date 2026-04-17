'use client';

import { useState, useTransition } from 'react';
import { deleteOrderAction } from '@/app/(dashboard)/orders/actions';

export default function DeleteOrderButton({ orderId }: { orderId: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleDelete() {
    if (!window.confirm('Удалить заказ? Это действие нельзя отменить.')) return;
    setError(null);
    startTransition(async () => {
      try {
        await deleteOrderAction(orderId);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Ошибка');
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
        {isPending ? 'Удаление...' : 'Удалить заказ'}
      </button>
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}