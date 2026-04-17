'use client';

import { useState, useTransition } from 'react';
import { changeOrderStatusAction } from '@/app/(dashboard)/orders/actions';
import { STATUS_LABELS, STATUS_COLORS } from '@/lib/utils/format';
import type { OrderStatus } from '@/types/database';

const ALL_STATUSES: OrderStatus[] = ['new', 'in_progress', 'completed', 'canceled'];

export default function OrderStatusSwitcher({
  orderId,
  currentStatus,
}: {
  orderId: string;
  currentStatus: OrderStatus;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function setStatus(next: OrderStatus) {
    if (next === currentStatus) return;
    setError(null);
    startTransition(async () => {
      try {
        await changeOrderStatusAction(orderId, next);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Ошибка');
      }
    });
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {ALL_STATUSES.map((s) => {
          const active = s === currentStatus;
          return (
            <button
              key={s}
              type="button"
              onClick={() => setStatus(s)}
              disabled={isPending || active}
              className={`text-xs font-medium px-3 py-1.5 rounded-full transition ${
                active
                  ? `${STATUS_COLORS[s]} ring-2 ring-offset-1 ring-offset-white dark:ring-offset-neutral-900`
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
              } disabled:opacity-60`}
            >
              {STATUS_LABELS[s]}
            </button>
          );
        })}
      </div>
      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
    </div>
  );
}