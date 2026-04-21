import Link from 'next/link';
import { getDictionary } from '@/lib/i18n/server';
import { createClient } from '@/lib/supabase/server';
import { formatPrice, STATUS_COLORS } from '@/lib/utils/format';
import type { OrderStatus, OrderWithClient } from '@/types/database';

export default async function TrashPage() {
  const { locale } = await getDictionary();

  const text =
    locale === 'de'
      ? {
          back: 'Zurueck zu den Auftraegen',
          title: 'Papierkorb der Auftraege',
          countSuffix: 'Stk.',
          archiveTitle: 'Archivierte Dokumente',
          archiveText:
            'Auftraege mit Quittung duerfen nicht spurlos geloescht werden. In diesem Bereich bleiben sie nur ausgeblendet erhalten.',
          noInvoiceText:
            'Auftraege ohne Quittung koennen nach einer Pruefung spaeter bereinigt werden. Dieser Bereich entfernt sie jedoch nicht automatisch.',
          error: 'Fehler',
          empty: 'Papierkorb ist leer',
          noInvoice: 'Ohne Quittung',
          hiddenAt: 'Versteckt',
          archivedNote: 'Dokument bleibt wegen Quittung im Archiv',
          laterCleanup: 'Kann nach Pruefung spaeter bereinigt werden',
        }
      : {
          back: 'Назад к заказам',
          title: 'Корзина заказов',
          countSuffix: 'шт.',
          archiveTitle: 'Архивные документы',
          archiveText:
            'Заказы с квитанцией нельзя удалить окончательно. В этом разделе они только скрываются и остаются в архиве.',
          noInvoiceText:
            'Заказы без квитанции можно очистить позже после проверки. Этот раздел не удаляет их автоматически.',
          error: 'Ошибка',
          empty: 'Корзина пуста',
          noInvoice: 'Без квитанции',
          hiddenAt: 'Скрыт',
          archivedNote: 'Документ остается в архиве из-за квитанции',
          laterCleanup: 'Можно очистить позже после проверки',
        };

  const formatDate = (value: string | null | undefined) => {
    if (!value) return '—';
    return new Intl.DateTimeFormat(locale === 'de' ? 'de-DE' : 'ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(value));
  };

  const statusLabels: Record<OrderStatus, string> =
    locale === 'de'
      ? {
          new: 'Neu',
          in_progress: 'In Arbeit',
          completed: 'Abgeschlossen',
          canceled: 'Abgebrochen',
        }
      : {
          new: 'Новый',
          in_progress: 'В работе',
          completed: 'Завершен',
          canceled: 'Отменен',
        };

  const supabase = await createClient();
  const { data: orders, error } = await supabase
    .from('orders_with_client')
    .select('*')
    .not('deleted_at', 'is', null)
    .order('deleted_at', { ascending: false });

  const list = (orders ?? []) as OrderWithClient[];
  const archivedCount = list.filter((order) => Boolean(order.invoice_number)).length;

  return (
    <div>
      <div className="mb-4">
        <Link href="/orders" className="text-sm text-neutral-500 hover:text-neutral-700">
          ← {text.back}
        </Link>
      </div>

      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{text.title}</h1>
        <span className="text-sm text-neutral-500">
          {list.length} {text.countSuffix}
        </span>
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
          <strong>{text.archiveTitle}:</strong> {archivedCount}
          <div className="mt-1">{text.archiveText}</div>
        </div>
        <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-xs text-neutral-700">
          {text.noInvoiceText}
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {text.error}: {error.message}
        </div>
      )}

      {list.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-300 p-8 text-center text-sm text-neutral-500">
          {text.empty}
        </div>
      ) : (
        <ul className="space-y-2">
          {list.map((order) => (
            <li key={order.id}>
              <Link
                href={`/orders/${order.id}`}
                className="block rounded-xl border border-neutral-200 bg-white p-4 transition hover:border-blue-500"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[order.status]}`}>
                        {statusLabels[order.status]}
                      </span>
                      {order.invoice_number ? (
                        <span className="rounded bg-blue-100 px-2 py-0.5 font-mono text-xs text-blue-700">
                          {order.invoice_number}
                        </span>
                      ) : (
                        <span className="rounded bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600">
                          {text.noInvoice}
                        </span>
                      )}
                      <span className="text-xs text-neutral-500">
                        {text.hiddenAt} {formatDate(order.deleted_at)}
                      </span>
                    </div>
                    <h3 className="truncate font-medium">{order.client_name}</h3>
                    <p className="truncate text-sm text-neutral-500">{order.custom_service_title ?? '—'}</p>
                    <div className="mt-1 text-xs text-neutral-500">
                      {order.invoice_number ? text.archivedNote : text.laterCleanup}
                    </div>
                  </div>
                  <div className="whitespace-nowrap text-right">
                    <div className="font-semibold">{formatPrice(order.custom_price)}</div>
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
