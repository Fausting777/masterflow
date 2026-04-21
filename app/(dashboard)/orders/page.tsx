import Link from 'next/link';
import InvoiceBadges from '@/components/orders/InvoiceBadges';
import { isInvoiceSnapshot } from '@/lib/invoices/snapshot';
import { getLocale } from '@/lib/i18n/server';
import { createClient } from '@/lib/supabase/server';
import { formatPrice, STATUS_COLORS } from '@/lib/utils/format';
import type { OrderStatus, OrderWithClient } from '@/types/database';

type SearchParams = Promise<{
  status?: string;
  invoice?: string;
  q?: string;
}>;

const STATUS_FILTERS: Array<{ key: OrderStatus | 'all' }> = [
  { key: 'all' },
  { key: 'new' },
  { key: 'in_progress' },
  { key: 'completed' },
  { key: 'canceled' },
];

const INVOICE_FILTERS = [
  { key: 'all', icon: '' },
  { key: 'with', icon: '€' },
  { key: 'without', icon: '!' },
  { key: 'sent', icon: '✓' },
] as const;

const DASH = '—';

export default async function OrdersPage({ searchParams }: { searchParams: SearchParams }) {
  const { status, invoice, q } = await searchParams;
  const activeFilter = (status ?? 'all') as OrderStatus | 'all';
  const invoiceFilter = (invoice ?? 'all') as 'all' | 'with' | 'without' | 'sent';
  const locale = await getLocale();

  const text =
    locale === 'de'
      ? {
          title: 'Auftraege',
          trash: 'Papierkorb',
          new: 'Neu',
          all: 'Alle',
          newStatus: 'Neu',
          inProgress: 'In Arbeit',
          completed: 'Abgeschlossen',
          canceled: 'Abgebrochen',
          withInvoice: 'Mit Rechnung',
          withoutInvoice: 'Ohne Rechnung',
          sent: 'Versendet',
          summaryWithoutTitle: 'Auftraege ohne Rechnung',
          summaryInvoicesTitle: 'Rechnungen in der aktuellen Auswahl',
          ordersCount: 'Auftrag',
          ordersCount2: 'Auftraege',
          ordersCount5: 'Auftraege',
          invoicesCount: 'Rechnung',
          invoicesCount2: 'Rechnungen',
          onAmount: 'im Wert von',
          error: 'Fehler',
          emptyDefault: 'Noch keine Auftraege.',
          createFirst: 'Ersten Auftrag erstellen',
          emptyFilter: 'Keine Auftraege fuer diesen Filter',
        }
      : {
          title: 'Заказы',
          trash: 'Корзина',
          new: 'Новый',
          all: 'Все',
          newStatus: 'Новые',
          inProgress: 'В работе',
          completed: 'Завершенные',
          canceled: 'Отмененные',
          withInvoice: 'Со счетом',
          withoutInvoice: 'Без счета',
          sent: 'Отправленные',
          summaryWithoutTitle: 'Заказы без счета',
          summaryInvoicesTitle: 'Счета в текущей выборке',
          ordersCount: 'заказ',
          ordersCount2: 'заказа',
          ordersCount5: 'заказов',
          invoicesCount: 'счет',
          invoicesCount2: 'счета',
          onAmount: 'на сумму',
          error: 'Ошибка',
          emptyDefault: 'Пока нет заказов.',
          createFirst: 'Создать первый',
          emptyFilter: 'Нет заказов по этому фильтру',
        };

  const formatDate = (value: string | null | undefined) => {
    if (!value) return DASH;
    return new Intl.DateTimeFormat(locale === 'de' ? 'de-DE' : 'ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(value));
  };

  const statusLabels: Record<OrderStatus, string> = {
    new: text.newStatus,
    in_progress: text.inProgress,
    completed: text.completed,
    canceled: text.canceled,
  };

  const supabase = await createClient();

  let query = supabase
    .from('orders_with_client')
    .select('*')
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (activeFilter !== 'all') {
    query = query.eq('status', activeFilter);
  }

  if (invoiceFilter === 'with') {
    query = query.not('invoice_number', 'is', null);
  } else if (invoiceFilter === 'without') {
    query = query.is('invoice_number', null);
  } else if (invoiceFilter === 'sent') {
    query = query.not('invoice_sent_at', 'is', null);
  }

  const { data: orders, error } = await query;
  const ordersList = (orders as OrderWithClient[] | null) ?? [];

  const servicesNeeded = [
    ...new Set(
      ordersList.filter((order) => order.custom_price === null && order.service_id).map((order) => order.service_id!)
    ),
  ];

  const servicePrices = new Map<string, number>();
  if (servicesNeeded.length > 0) {
    const { data: services } = await supabase.from('services').select('id, default_price').in('id', servicesNeeded);

    for (const service of services ?? []) {
      if (service.default_price !== null) {
        servicePrices.set(service.id, Number(service.default_price));
      }
    }
  }

  const getOrderAmount = (order: OrderWithClient) => {
    const snapshot = isInvoiceSnapshot(order.invoice_snapshot_json) ? order.invoice_snapshot_json : null;
    if (snapshot?.order.price !== undefined && snapshot?.order.price !== null) {
      return Number(snapshot.order.price);
    }

    if (order.custom_price !== null) {
      return Number(order.custom_price);
    }

    if (order.service_id) {
      return servicePrices.get(order.service_id) ?? null;
    }

    return null;
  };

  let invoiceSummary: { total: number; count: number; title: string; icon: string; label: string } | null = null;

  if (ordersList.length > 0) {
    let total = 0;
    let count = 0;

    for (const order of ordersList) {
      const amount = getOrderAmount(order);
      if (amount !== null) {
        total += amount;
        count++;
      }
    }

    if (invoiceFilter === 'without') {
      invoiceSummary = {
        total: Math.round(total * 100) / 100,
        count,
        title: text.summaryWithoutTitle,
        icon: '!',
        label: getOrderLabel(count, locale, text),
      };
    } else {
      const invoiceOrders = ordersList.filter((order) => Boolean(order.invoice_number));
      let invoiceTotal = 0;
      let invoiceCount = 0;

      for (const order of invoiceOrders) {
        const amount = getOrderAmount(order);
        if (amount !== null) {
          invoiceTotal += amount;
          invoiceCount++;
        }
      }

      if (invoiceCount > 0) {
        invoiceSummary = {
          total: Math.round(invoiceTotal * 100) / 100,
          count: invoiceCount,
          title: text.summaryInvoicesTitle,
          icon: '€',
          label: getInvoiceLabel(invoiceCount, locale, text),
        };
      }
    }
  }

  function buildHref(params: { status?: string; invoice?: string }) {
    const searchParamsNext = new URLSearchParams();
    const nextStatus = params.status ?? activeFilter;
    const nextInvoice = params.invoice ?? invoiceFilter;

    if (nextStatus !== 'all') searchParamsNext.set('status', nextStatus);
    if (nextInvoice !== 'all') searchParamsNext.set('invoice', nextInvoice);
    if (q) searchParamsNext.set('q', q);

    return `/orders${searchParamsNext.toString() ? `?${searchParamsNext}` : ''}`;
  }

  const statusFilterLabels: Record<OrderStatus | 'all', string> = {
    all: text.all,
    new: text.newStatus,
    in_progress: text.inProgress,
    completed: text.completed,
    canceled: text.canceled,
  };

  const invoiceLabels: Record<string, string> = {
    all: text.all,
    with: text.withInvoice,
    without: text.withoutInvoice,
    sent: text.sent,
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{text.title}</h1>
        <div className="flex items-center gap-2">
          <Link
            href="/orders/trash"
            className="rounded-lg px-3 py-2 text-sm text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
            title={text.trash}
          >
            🗑
          </Link>
          <Link href="/orders/new" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
            + {text.new}
          </Link>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        {STATUS_FILTERS.map((filter) => {
          const active = filter.key === activeFilter;
          return (
            <Link
              key={filter.key}
              href={buildHref({ status: filter.key })}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                active
                  ? 'bg-blue-600 text-white'
                  : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700'
              }`}
            >
              {statusFilterLabels[filter.key]}
            </Link>
          );
        })}
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {INVOICE_FILTERS.map((filter) => {
          const active = filter.key === invoiceFilter;
          return (
            <Link
              key={filter.key}
              href={buildHref({ invoice: filter.key })}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                active ? 'bg-blue-600 text-white' : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
              }`}
            >
              {filter.icon && <span className="mr-1">{filter.icon}</span>}
              {invoiceLabels[filter.key]}
            </Link>
          );
        })}
      </div>

      {invoiceSummary && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">{invoiceSummary.icon}</span>
            <div>
              <div className="text-xs uppercase tracking-wide text-neutral-600">{invoiceSummary.title}</div>
              <div className="text-sm text-amber-900">
                <span className="font-semibold">{invoiceSummary.count}</span> {invoiceSummary.label} {text.onAmount}
              </div>
            </div>
          </div>
          <div className="text-2xl font-bold text-amber-700">{formatPrice(invoiceSummary.total)}</div>
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {text.error}: {error.message}
        </div>
      )}

      {ordersList.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-300 p-8 text-center text-sm text-neutral-500 dark:border-neutral-700">
          {activeFilter === 'all' && invoiceFilter === 'all' ? (
            <>
              {text.emptyDefault}{' '}
              <Link href="/orders/new" className="text-blue-600 hover:underline">
                {text.createFirst}
              </Link>
            </>
          ) : (
            text.emptyFilter
          )}
        </div>
      ) : (
        <ul>
          {ordersList.map((order) => (
            <li key={order.id}>
              <Link
                href={`/orders/${order.id}`}
                className="block rounded-xl border border-neutral-200 bg-white p-4 transition hover:border-blue-500 dark:border-neutral-800 dark:bg-neutral-900"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[order.status]}`}>
                        {statusLabels[order.status]}
                      </span>
                      <InvoiceBadges invoiceNumber={order.invoice_number} invoiceSentAt={order.invoice_sent_at} />
                      <span className="text-xs text-neutral-500">{formatDate(order.created_at)}</span>
                    </div>
                    <h3 className="truncate font-medium">{order.client_name}</h3>
                    <p className="truncate text-sm text-neutral-500">
                      {order.custom_service_title ?? DASH}
                      {order.order_address ? ` · ${order.order_address}` : ''}
                    </p>
                  </div>
                  <div className="whitespace-nowrap text-right">
                    <div className="font-semibold">{formatPrice(getOrderAmount(order))}</div>
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

function getOrderLabel(
  count: number,
  locale: 'ru' | 'de',
  text: { ordersCount: string; ordersCount2: string; ordersCount5: string }
) {
  if (locale === 'de') {
    return count === 1 ? text.ordersCount : text.ordersCount2;
  }

  if (count % 10 === 1 && count % 100 !== 11) return text.ordersCount;
  if (count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 12 || count % 100 > 14)) return text.ordersCount2;
  return text.ordersCount5;
}

function getInvoiceLabel(
  count: number,
  locale: 'ru' | 'de',
  text: { invoicesCount: string; invoicesCount2: string }
) {
  if (locale === 'de') {
    return count === 1 ? text.invoicesCount : text.invoicesCount2;
  }

  if (count % 10 === 1 && count % 100 !== 11) return text.invoicesCount;
  if (count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 12 || count % 100 > 14)) return text.invoicesCount2;
  return 'счетов';
}
