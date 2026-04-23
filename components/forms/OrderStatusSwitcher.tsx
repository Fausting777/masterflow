'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
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
  const router = useRouter();
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
          new: '\u041d\u043e\u0432\u044b\u0439',
          in_progress: '\u0412 \u0440\u0430\u0431\u043e\u0442\u0435',
          completed: '\u0417\u0430\u0432\u0435\u0440\u0448\u0435\u043d',
          canceled: '\u041e\u0442\u043c\u0435\u043d\u0435\u043d',
        };

  const genericError = locale === 'de' ? 'Fehler' : '\u041e\u0448\u0438\u0431\u043a\u0430';

  function setStatus(next: OrderStatus) {
    if (next === currentStatus) return;
    setError(null);
    startTransition(async () => {
      const result = await changeOrderStatusAction(orderId, next);
      if (!result.ok) {
        setError(result.error ?? genericError);
        return;
      }
      router.refresh();
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
