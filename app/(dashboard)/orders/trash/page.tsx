import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import {
  formatPrice,
  formatDate,
  STATUS_LABELS,
  STATUS_COLORS,
} from '@/lib/utils/format';
import type { OrderWithClient } from '@/types/database';

export default async function TrashPage() {
  const supabase = await createClient();

  const { data: orders, error } = await supabase
    .from('orders_with_client')
    .select('*')
    .not('deleted_at', 'is', null)
    .order('deleted_at', { ascending: false });

  const list = (orders ?? []) as OrderWithClient[];

  return (
    <div>
      <div className="mb-4">
        <Link href="/orders" className="text-sm text-neutral-500 hover:text-neutral-700">
          ← Назад к заказам
        </Link>
      </div>

      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">🗑 Корзина</h1>
        <span className="text-sm text-neutral-500">{list.length} шт.</span>
      </div>

      <div className="mb-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800">
        <strong>⚠️ Важно:</strong> заказы со счётом (№ 2026-XXXX) нельзя удалить окончательно —
        §14 UStG требует хранить счета 10 лет. Ты можешь только восстановить их.
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700 mb-4">
          Ошибка: {error.message}
        </div>
      )}

      {list.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-300 p-8 text-center text-sm text-neutral-500">
          Корзина пуста
        </div>
      ) : (
        <ul className="space-y-2">
          {list.map((o) => (
            <li key={o.id}>
              <Link
                href={`/orders/${o.id}`}
                className="block bg-white border border-neutral-200 rounded-xl p-4 hover:border-blue-500 transition opacity-75"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[o.status]}`}>
                        {STATUS_LABELS[o.status]}
                      </span>
                      {o.invoice_number && (
                        <span className="text-xs font-mono bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                          {o.invoice_number}
                        </span>
                      )}
                      <span className="text-xs text-neutral-500">
                        Удалён {formatDate(o.deleted_at)}
                      </span>
                    </div>
                    <h3 className="font-medium truncate">{o.client_name}</h3>
                    <p className="text-sm text-neutral-500 truncate">
                      {o.custom_service_title ?? '—'}
                    </p>
                  </div>
                  <div className="text-right whitespace-nowrap">
                    <div className="font-semibold">{formatPrice(o.custom_price)}</div>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}