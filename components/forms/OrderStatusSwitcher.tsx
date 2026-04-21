'use client';

import { useState, useTransition } from 'react';
import { changeOrderStatusAction } from '@/app/(dashboard)/orders/actions';
import { useI18n } from '@/components/i18n/LocaleProvider';
import { STATUS_COLORS } from '@/lib/utils/format';
import type { OrderStatus } from '@/types/database';

const ALL_STATUSES: OrderStatus[] = ['new', 'in_progress', 'completed', 'canceled'];

export default function OrderStatusSwitcher({
  orderId,
  currentStatus,
}: {
  orderId: string;
  currentStatus: OrderStatus;
}) {
  const { locale } = useI18n();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const labels: Record<OrderStatus, string> =
    locale === 'de'
      ? {
          new: 'Neu',
          in_progress: 'In Arbeit',
          completed: 'Abgeschlossen',
          canceled: 'Storniert',
        }
      : {
          new: 'Новый',
          in_progress: 'В работе',
          completed: 'Завершен',
          canceled: 'Отменен',
        };

  const genericError = locale === 'de' ? 'Fehler' : 'Ошибка';

  function setStatus(next: OrderStatus) {
    if (next === currentStatus) return;
    setError(null);
    startTransition(async () => {
      try {
        await changeOrderStatusAction(orderId, next);
      } catch (e) {
        setError(e instanceof Error ? e.message : genericError);
      }
    });
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {ALL_STATUSES.map((status) => {
          const active = status === currentStatus;
          return (
            <button
              key={status}
              type="button"
              onClick={() => setStatus(status)}
              disabled={isPending || active}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                active
                  ? `${STATUS_COLORS[status]} ring-2 ring-offset-1 ring-offset-white dark:ring-offset-neutral-900`
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700'
              } disabled:opacity-60`}
            >
              {labels[status]}
            </button>
          );
        })}
      </div>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
