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
      setError('Нельзя: по заказу уже выпущен счет, такой документ должен храниться по правилам бухгалтерского учета.');
      return;
    }
    if (
      !window.confirm(
        'Окончательно удалить заказ со всеми фото и файлами?\n\nЭто действие нельзя отменить.'
      )
    ) {
      return;
    }
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
          className="flex-1 rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:bg-blue-400"
        >
          {isPending ? 'Восстановление...' : 'Восстановить'}
        </button>

        <button
          type="button"
          onClick={handlePermanentDelete}
          disabled={isPending || hasInvoice}
          title={hasInvoice ? 'Нельзя: есть выставленный счет' : ''}
          className="rounded-lg border border-red-300 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Удалить навсегда
        </button>
      </div>

      {hasInvoice && (
        <p className="text-xs text-neutral-500">
          Этот заказ защищен от окончательного удаления, потому что по нему уже существует счет или архивный документ.
        </p>
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
