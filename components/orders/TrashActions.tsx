'use client';

import { useState, useTransition } from 'react';
import {
  restoreOrderAction,
  permanentDeleteOrderAction,
} from '@/app/(dashboard)/orders/actions';

type Props = {
  orderId: string;
  hasInvoice: boolean;
};

export default function TrashActions({ orderId, hasInvoice }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleRestore() {
    if (!window.confirm('Восстановить заказ из корзины?')) return;
    setError(null);
    startTransition(async () => {
      try {
        await restoreOrderAction(orderId);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Ошибка');
      }
    });
  }

  function handlePermanentDelete() {
    if (hasInvoice) {
      setError('Нельзя: по заказу выставлен счёт, §14 UStG требует 10 лет хранения');
      return;
    }
    if (!window.confirm(
      'ОКОНЧАТЕЛЬНО удалить заказ со всеми фото и файлами?\n\n' +
      'Это действие нельзя отменить.'
    )) return;
    setError(null);
    startTransition(async () => {
      try {
        await permanentDeleteOrderAction(orderId);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Ошибка');
      }
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleRestore}
          disabled={isPending}
          className="flex-1 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2.5 text-sm transition"
        >
          {isPending ? 'Восстановление...' : '↻ Восстановить'}
        </button>

        <button
          type="button"
          onClick={handlePermanentDelete}
          disabled={isPending || hasInvoice}
          title={hasInvoice ? 'Нельзя: есть выставленный счёт' : ''}
          className="rounded-lg border border-red-300 text-red-600 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed px-4 py-2.5 text-sm font-medium"
        >
          Удалить навсегда
        </button>
      </div>

      {hasInvoice && (
        <p className="text-xs text-neutral-500">
          🔒 Этот заказ защищён от окончательного удаления, так как по нему выставлен счёт
          (№ {/* purely informational */}).
        </p>
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}