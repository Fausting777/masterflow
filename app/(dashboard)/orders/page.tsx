import Link from 'next/link';
import { ClipboardList, SlidersHorizontal } from 'lucide-react';
import EmptyState from '@/components/ui/EmptyState';
import ExportOrdersButton from '@/components/orders/ExportOrdersButton';
import InvoiceBadges from '@/components/orders/InvoiceBadges';
import { isInvoiceSnapshot } from '@/lib/invoices/snapshot';
import { getLocale } from '@/lib/i18n/server';
import { createClient } from '@/lib/supabase/server';
import { getMonthOptions, getRange } from '@/lib/utils/date-range';
import { formatPrice } from '@/lib/utils/format';
import type { OrderItem, OrderWithClient } from '@/types/database';

type SearchParams = Promise<{
  invoice?: string;
  q?: string;
  m?: string;
}>;

const INVOICE_FILTERS = [
  { key: 'all', icon: '' },
  { key: 'with', icon: 'PDF' },
  { key: 'without', icon: '!' },
  { key: 'sent', icon: 'Mail' },
] as const;

const DASH = '-';

function effectiveDate(order: Pick<OrderWithClient, 'service_date' | 'completed_at' | 'created_at'>) {
  return new Date(order.service_date ?? order.completed_at ?? order.created_at);
}

export default async function OrdersPage({ searchParams }: { searchParams: SearchParams }) {
  const { invoice, q, m } = await searchParams;
  const invoiceFilter = (invoice ?? 'all') as 'all' | 'with' | 'without' | 'sent';
  const currentMonth = m ?? '';
  const locale = await getLocale();
  const monthRange = currentMonth
    ? getRange('month', new Date(), { specificMonth: currentMonth, locale })
    : null;
  const monthOptions = getMonthOptions(2024, new Date(), locale);

  const text =
    locale === 'de'
      ? {
          title: 'Auftraege',
          trash: 'Papierkorb',
          new: 'Neu',
          all: 'Alle',
          withInvoice: 'Mit Quittung',
          withoutInvoice: 'Ohne Quittung',
          sent: 'Versendet',
          month: 'Monat',
          chooseMonth: 'Monat waehlen',
          apply: 'Anwenden',
          resetMonth: 'Monatsfilter entfernen',
          currentSelection: 'Aktuelle Auswahl',
          totalOrders: 'Gesamtauftraege',
          invoicedOrders: 'Mit Quittung',
          openOrders: 'Ohne Quittung',
          totalAmount: 'Gesamtsumme',
          amountHint: 'Summe aller Preise in der aktuellen Auswahl',
          error: 'Fehler',
          emptyDefault: 'Noch keine Auftraege.',
          createFirst: 'Ersten Auftrag erstellen',
          emptyFilter: 'Keine Auftraege fuer diesen Filter',
          monthSummaryPrefix: 'Zeitraum',
        }
      : {
          title: '\u0417\u0430\u043a\u0430\u0437\u044b',
          trash: '\u041a\u043e\u0440\u0437\u0438\u043d\u0430',
          new: '\u041d\u043e\u0432\u044b\u0439',
          all: '\u0412\u0441\u0435',
          withInvoice: '\u0421 \u043a\u0432\u0438\u0442\u0430\u043d\u0446\u0438\u0435\u0439',
          withoutInvoice: '\u0411\u0435\u0437 \u043a\u0432\u0438\u0442\u0430\u043d\u0446\u0438\u0438',
          sent: '\u041e\u0442\u043f\u0440\u0430\u0432\u043b\u0435\u043d\u043d\u044b\u0435',
          month: '\u041c\u0435\u0441\u044f\u0446',
          chooseMonth: '\u0412\u044b\u0431\u0440\u0430\u0442\u044c \u043c\u0435\u0441\u044f\u0446',
          apply: '\u041f\u0440\u0438\u043c\u0435\u043d\u0438\u0442\u044c',
          resetMonth: '\u0421\u0431\u0440\u043e\u0441\u0438\u0442\u044c \u043c\u0435\u0441\u044f\u0446',
          currentSelection: '\u0422\u0435\u043a\u0443\u0449\u0430\u044f \u0432\u044b\u0431\u043e\u0440\u043a\u0430',
          totalOrders: '\u0412\u0441\u0435\u0433\u043e \u0437\u0430\u043a\u0430\u0437\u043e\u0432',
          invoicedOrders: '\u0421 \u043a\u0432\u0438\u0442\u0430\u043d\u0446\u0438\u0435\u0439',
          openOrders: '\u0411\u0435\u0437 \u043a\u0432\u0438\u0442\u0430\u043d\u0446\u0438\u0438',
          totalAmount: '\u041e\u0431\u0449\u0430\u044f \u0441\u0443\u043c\u043c\u0430',
          amountHint: '\u0421\u0443\u043c\u043c\u0430 \u0432\u0441\u0435\u0445 \u0446\u0435\u043d \u0432 \u0442\u0435\u043a\u0443\u0449\u0435\u0439 \u0432\u044b\u0431\u043e\u0440\u043a\u0435',
          error: '\u041e\u0448\u0438\u0431\u043a\u0430',
          emptyDefault: '\u041f\u043e\u043a\u0430 \u043d\u0435\u0442 \u0437\u0430\u043a\u0430\u0437\u043e\u0432.',
          createFirst: '\u0421\u043e\u0437\u0434\u0430\u0442\u044c \u043f\u0435\u0440\u0432\u044b\u0439',
          emptyFilter: '\u041d\u0435\u0442 \u0437\u0430\u043a\u0430\u0437\u043e\u0432 \u0434\u043b\u044f \u044d\u0442\u043e\u0433\u043e \u0444\u0438\u043b\u044c\u0442\u0440\u0430',
          monthSummaryPrefix: '\u041f\u0435\u0440\u0438\u043e\u0434',
        };

  const formatDate = (value: string | null | undefined) => {
    if (!value) return DASH;
    return new Intl.DateTimeFormat(locale === 'de' ? 'de-DE' : 'ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(value));
  };

  const supabase = await createClient();

  let query = supabase
    .from('orders_with_client')
    .select('*')
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (invoiceFilter === 'with') {
    query = query.not('invoice_number', 'is', null);
  } else if (invoiceFilter === 'without') {
    query = query.is('invoice_number', null);
  } else if (invoiceFilter === 'sent') {
    query = query.not('invoice_sent_at', 'is', null);
  }

  const { data: orders, error } = await query;
  const baseOrders = (orders as OrderWithClient[] | null) ?? [];
  const ordersList = monthRange
    ? baseOrders.filter((order) => {
        const time = effectiveDate(order).getTime();
        return time >= monthRange.from.getTime() && time <= monthRange.to.getTime();
      })
    : baseOrders;

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

  const orderItemMap = new Map<string, OrderItem[]>();
  const orderIds = ordersList.map((order) => order.id);
  if (orderIds.length > 0) {
    const { data: orderItems } = await supabase
      .from('order_items')
      .select('*')
      .in('order_id', orderIds)
      .order('created_at', { ascending: true });

    for (const item of (orderItems ?? []) as OrderItem[]) {
      const current = orderItemMap.get(item.order_id) ?? [];
      current.push(item);
      orderItemMap.set(item.order_id, current);
    }
  }

  const getOrderAmount = (order: OrderWithClient) => {
    const snapshot = isInvoiceSnapshot(order.invoice_snapshot_json) ? order.invoice_snapshot_json : null;
    if (snapshot?.order.items && snapshot.order.items.length > 0) {
      return snapshot.order.items.reduce((sum, item) => sum + Number(item.price), 0);
    }

    if (snapshot?.order.price !== undefined && snapshot.order.price !== null) {
      return Number(snapshot.order.price);
    }

    const orderItems = orderItemMap.get(order.id);
    if (orderItems && orderItems.length > 0) {
      return orderItems.reduce((sum, item) => sum + Number(item.price), 0);
    }

    if (order.custom_price !== null) {
      return Number(order.custom_price);
    }

    if (order.service_id) {
      return servicePrices.get(order.service_id) ?? null;
    }

    return null;
  };

  const getOrderServiceTitle = (order: OrderWithClient) => {
    const snapshot = isInvoiceSnapshot(order.invoice_snapshot_json) ? order.invoice_snapshot_json : null;
    const snapshotItems = snapshot?.order.items;
    if (snapshotItems && snapshotItems.length > 0) {
      return snapshotItems.length > 1 ? `${snapshotItems[0].title} + ${snapshotItems.length - 1}` : snapshotItems[0].title;
    }

    const orderItems = orderItemMap.get(order.id);
    if (orderItems && orderItems.length > 0) {
      return orderItems.length > 1 ? `${orderItems[0].title} + ${orderItems.length - 1}` : orderItems[0].title;
    }

    return order.custom_service_title ?? DASH;
  };

  const totals = ordersList.reduce(
    (acc, order) => {
      const amount = getOrderAmount(order);
      if (amount !== null) {
        acc.totalAmount += amount;
      }

      if (order.invoice_number) {
        acc.withInvoice += 1;
      } else {
        acc.withoutInvoice += 1;
      }

      acc.totalOrders += 1;
      return acc;
    },
    { totalOrders: 0, withInvoice: 0, withoutInvoice: 0, totalAmount: 0 }
  );

  function buildHref(params: { invoice?: string; m?: string | null }) {
    const searchParamsNext = new URLSearchParams();
    const nextInvoice = params.invoice ?? invoiceFilter;
    const nextMonth = params.m === undefined ? currentMonth : params.m ?? '';

    if (nextInvoice !== 'all') searchParamsNext.set('invoice', nextInvoice);
    if (nextMonth) searchParamsNext.set('m', nextMonth);
    if (q) searchParamsNext.set('q', q);

    return `/orders${searchParamsNext.toString() ? `?${searchParamsNext}` : ''}`;
  }

  const invoiceLabels: Record<string, string> = {
    all: text.all,
    with: text.withInvoice,
    without: text.withoutInvoice,
    sent: text.sent,
  };

  const roundedTotal = Math.round(totals.totalAmount * 100) / 100;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{text.title}</h1>
        <div className="flex flex-wrap items-center gap-2">
          <ExportOrdersButton invoice={invoiceFilter} month={currentMonth || null} />
          <Link
            href="/orders/trash"
            className="rounded-lg px-3 py-2 text-sm text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
            title={text.trash}
          >
            {text.trash}
          </Link>
          <Link
            href="/orders/new"
            className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium leading-none text-white hover:bg-blue-700 sm:px-4"
          >
            + {text.new}
          </Link>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {INVOICE_FILTERS.map((filter) => {
          const active = filter.key === invoiceFilter;
          return (
            <Link
              key={filter.key}
              href={buildHref({ invoice: filter.key })}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                active ? 'bg-blue-600 text-white' : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700'
              }`}
            >
              {filter.icon ? <span className="mr-1">{filter.icon}</span> : null}
              {invoiceLabels[filter.key]}
            </Link>
          );
        })}
      </div>

      <form method="get" className="mb-4 rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label htmlFor="month" className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              {text.month}
            </label>
            <select
              id="month"
              name="m"
              defaultValue={currentMonth}
              className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-neutral-700 dark:bg-neutral-800"
            >
              <option value="">{`- ${text.chooseMonth} -`}</option>
              {monthOptions.map((month) => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </select>
          </div>

          {invoiceFilter !== 'all' && <input type="hidden" name="invoice" value={invoiceFilter} />}
          {q && <input type="hidden" name="q" value={q} />}

          <button
            type="submit"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            {text.apply}
          </button>

          {currentMonth && (
            <Link
              href={buildHref({ m: null })}
              className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              {text.resetMonth}
            </Link>
          )}
        </div>
      </form>

      <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="text-xs uppercase tracking-wide text-neutral-600 dark:text-neutral-400">{text.currentSelection}</div>
            {monthRange && (
              <div className="text-sm text-amber-900 dark:text-amber-300">
                {text.monthSummaryPrefix}: <span className="font-medium">{monthRange.label}</span>
              </div>
            )}
          </div>
          <div className="text-2xl font-bold text-amber-700 dark:text-amber-300">{formatPrice(roundedTotal)}</div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <SummaryCard label={text.totalOrders} value={String(totals.totalOrders)} />
          <SummaryCard label={text.invoicedOrders} value={String(totals.withInvoice)} />
          <SummaryCard label={text.openOrders} value={String(totals.withoutInvoice)} />
          <SummaryCard label={text.totalAmount} value={formatPrice(roundedTotal)} hint={text.amountHint} />
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
          {text.error}: {error.message}
        </div>
      )}

      {ordersList.length === 0 ? (
        invoiceFilter === 'all' && !currentMonth ? (
          <EmptyState
            icon={ClipboardList}
            title={text.emptyDefault}
            action={{ href: '/orders/new', label: text.createFirst }}
          />
        ) : (
          <EmptyState
            icon={SlidersHorizontal}
            title={text.emptyFilter}
          />
        )
      ) : (
        <ul className="space-y-2">
          {ordersList.map((order) => (
            <li key={order.id}>
              <Link
                href={`/orders/${order.id}`}
                className={`block rounded-xl border bg-white p-4 transition duration-200 hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98] dark:bg-neutral-900 ${
                  order.invoice_sent_at
                    ? 'border-neutral-200 border-l-4 border-l-blue-500 dark:border-neutral-800 dark:border-l-blue-600'
                    : order.invoice_number
                    ? 'border-neutral-200 border-l-4 border-l-green-500 dark:border-neutral-800 dark:border-l-green-600'
                    : 'border-neutral-200 border-l-4 border-l-neutral-300 dark:border-neutral-800 dark:border-l-neutral-700'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <InvoiceBadges
                        invoiceNumber={order.invoice_number}
                        invoiceSentAt={order.invoice_sent_at}
                        locale={locale}
                      />
                      <span className="text-xs text-neutral-500">
                        {formatDate(effectiveDate(order).toISOString())}
                      </span>
                    </div>
                    <h3 className="truncate font-medium">{order.client_name}</h3>
                    <p className="truncate text-sm text-neutral-500">
                      {getOrderServiceTitle(order)}
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

function SummaryCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-white/70 bg-white/70 p-3 dark:border-amber-900/50 dark:bg-amber-950/20">
      <div className="text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">{label}</div>
      <div className="mt-1 text-xl font-semibold text-neutral-900 dark:text-neutral-100">{value}</div>
      {hint ? <div className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{hint}</div> : null}
    </div>
  );
}
