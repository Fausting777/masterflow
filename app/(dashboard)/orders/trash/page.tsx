import Link from 'next/link';
import { getDictionary } from '@/lib/i18n/server';
import { createClient } from '@/lib/supabase/server';
import { formatPrice } from '@/lib/utils/format';
import type { OrderWithClient } from '@/types/database';

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
          back: '\u041d\u0430\u0437\u0430\u0434 \u043a \u0437\u0430\u043a\u0430\u0437\u0430\u043c',
          title: '\u041a\u043e\u0440\u0437\u0438\u043d\u0430 \u0437\u0430\u043a\u0430\u0437\u043e\u0432',
          countSuffix: '\u0448\u0442.',
          archiveTitle: '\u0410\u0440\u0445\u0438\u0432\u043d\u044b\u0435 \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u044b',
          archiveText:
            '\u0417\u0430\u043a\u0430\u0437\u044b \u0441 \u043a\u0432\u0438\u0442\u0430\u043d\u0446\u0438\u0435\u0439 \u043d\u0435\u043b\u044c\u0437\u044f \u0443\u0434\u0430\u043b\u0438\u0442\u044c \u043e\u043a\u043e\u043d\u0447\u0430\u0442\u0435\u043b\u044c\u043d\u043e. \u0412 \u044d\u0442\u043e\u043c \u0440\u0430\u0437\u0434\u0435\u043b\u0435 \u043e\u043d\u0438 \u0442\u043e\u043b\u044c\u043a\u043e \u0441\u043a\u0440\u044b\u0432\u0430\u044e\u0442\u0441\u044f \u0438 \u043e\u0441\u0442\u0430\u044e\u0442\u0441\u044f \u0432 \u0430\u0440\u0445\u0438\u0432\u0435.',
          noInvoiceText:
            '\u0417\u0430\u043a\u0430\u0437\u044b \u0431\u0435\u0437 \u043a\u0432\u0438\u0442\u0430\u043d\u0446\u0438\u0438 \u043c\u043e\u0436\u043d\u043e \u043e\u0447\u0438\u0441\u0442\u0438\u0442\u044c \u043f\u043e\u0437\u0436\u0435 \u043f\u043e\u0441\u043b\u0435 \u043f\u0440\u043e\u0432\u0435\u0440\u043a\u0438. \u042d\u0442\u043e\u0442 \u0440\u0430\u0437\u0434\u0435\u043b \u043d\u0435 \u0443\u0434\u0430\u043b\u044f\u0435\u0442 \u0438\u0445 \u0430\u0432\u0442\u043e\u043c\u0430\u0442\u0438\u0447\u0435\u0441\u043a\u0438.',
          error: '\u041e\u0448\u0438\u0431\u043a\u0430',
          empty: '\u041a\u043e\u0440\u0437\u0438\u043d\u0430 \u043f\u0443\u0441\u0442\u0430',
          noInvoice: '\u0411\u0435\u0437 \u043a\u0432\u0438\u0442\u0430\u043d\u0446\u0438\u0438',
          hiddenAt: '\u0421\u043a\u0440\u044b\u0442',
          archivedNote: '\u0414\u043e\u043a\u0443\u043c\u0435\u043d\u0442 \u043e\u0441\u0442\u0430\u0435\u0442\u0441\u044f \u0432 \u0430\u0440\u0445\u0438\u0432\u0435 \u0438\u0437-\u0437\u0430 \u043a\u0432\u0438\u0442\u0430\u043d\u0446\u0438\u0438',
          laterCleanup: '\u041c\u043e\u0436\u043d\u043e \u043e\u0447\u0438\u0441\u0442\u0438\u0442\u044c \u043f\u043e\u0437\u0436\u0435 \u043f\u043e\u0441\u043b\u0435 \u043f\u0440\u043e\u0432\u0435\u0440\u043a\u0438',
        };

  const formatDate = (value: string | null | undefined) => {
    if (!value) return '-';
    return new Intl.DateTimeFormat(locale === 'de' ? 'de-DE' : 'ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(value));
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
                    <p className="truncate text-sm text-neutral-500">{order.custom_service_title ?? '-'}</p>
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
