import Link from 'next/link';
import { FileText, SearchX } from 'lucide-react';
import EmptyState from '@/components/ui/EmptyState';
import ExportButton from '@/components/invoices/ExportButton';
import PeriodPicker from '@/components/stats/PeriodPicker';
import { isInvoiceSnapshot } from '@/lib/invoices/snapshot';
import { getLocale } from '@/lib/i18n/server';
import { createClient } from '@/lib/supabase/server';
import { getMonthOptions, getRange, type PeriodKey } from '@/lib/utils/date-range';
import { formatPrice } from '@/lib/utils/format';

type SearchParams = Promise<{
  period?: string;
  from?: string;
  to?: string;
  q?: string;
}>;

type InvoiceRow = {
  id: string;
  invoice_number: string;
  invoice_issued_at: string | null;
  service_date: string | null;
  custom_service_title: string | null;
  custom_price: number | null;
  service_id: string | null;
  client_id: string;
  invoice_sent_at: string | null;
  invoice_snapshot_json: unknown | null;
  correction_of_order_id: string | null;
};

const DASH = '-';

export default async function InvoicesPage({ searchParams }: { searchParams: SearchParams }) {
  const { period, from, to, q } = await searchParams;
  const activePeriod = (period ?? 'all') as PeriodKey;
  const search = (q ?? '').trim();
  const locale = await getLocale();
  const currentMonth = activePeriod === 'month' ? from ?? null : null;
  const range = getRange(activePeriod, new Date(), {
    from: activePeriod === 'custom' && from ? new Date(`${from}T00:00:00`) : undefined,
    to: activePeriod === 'custom' && to ? new Date(`${to}T23:59:59`) : undefined,
    specificMonth: activePeriod === 'month' ? currentMonth ?? undefined : undefined,
    locale,
  });
  const monthOptions = getMonthOptions(2024, new Date(), locale);

  const text =
    locale === 'de'
      ? {
          title: 'Quittungen',
          month: 'Monat',
          quarter: 'Quartal',
          year: 'Jahr',
          allTime: 'Alles',
          periodDesc: 'Alle ausgestellten Quittungen im Zeitraum',
          searchPlaceholder: 'Freie Suche nach Quittungsnummer, Kunde, Leistung oder Betrag...',
          summaryTitle: 'Quittungen in der aktuellen Auswahl',
          total: 'Gesamt',
          error: 'Fehler',
          emptySearch: 'Nichts gefunden fuer die Suche',
          emptyPeriod: 'Keine ausgestellten Quittungen in diesem Zeitraum',
          number: 'Nummer',
          date: 'Datum',
          client: 'Kunde',
          service: 'Leistung',
          amount: 'Betrag',
          sentAt: 'Versendet',
          correction: 'Korrektur',
          archiveNote:
            'Archivquittungen werden aus dem Snapshot zum Zeitpunkt der Ausstellung angezeigt. Korrekturen werden als separate Dokumente angezeigt und ersetzen nicht die urspruengliche Quittung.',
          export: 'CSV exportieren',
        }
      : {
          title: 'Квитанции',
          month: 'Месяц',
          quarter: 'Квартал',
          year: 'Год',
          allTime: 'Все',
          periodDesc: 'Все выставленные квитанции за период',
          searchPlaceholder: 'Поиск по номеру квитанции, клиенту, услуге или сумме...',
          summaryTitle: 'Квитанции в текущей выборке',
          total: 'Итого',
          error: 'Ошибка',
          emptySearch: 'Ничего не найдено по запросу',
          emptyPeriod: 'Нет выставленных квитанций за этот период',
          number: 'Номер',
          date: 'Дата',
          client: 'Клиент',
          service: 'Услуга',
          amount: 'Сумма',
          sentAt: 'Отправлено',
          correction: 'Корректировка',
          archiveNote:
            'Архивные квитанции показываются из snapshot на момент выставления. Корректировки отображаются как отдельные документы и не заменяют исходную квитанцию.',
          export: 'Экспорт CSV',
        };

  const formatDate = (value: string | null | undefined) => {
    if (!value) return DASH;
    return new Intl.DateTimeFormat(locale === 'de' ? 'de-DE' : 'ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(value));
  };

  const getInvoiceLabel = (count: number) => {
    if (locale === 'de') {
      return count === 1 ? 'Quittung' : 'Quittungen';
    }

    const mod10 = count % 10;
    const mod100 = count % 100;
    if (mod10 === 1 && mod100 !== 11) return 'квитанция';
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'квитанции';
    return 'квитанций';
  };

  const periodButtons: Array<{ key: PeriodKey; label: string }> = [
    { key: 'month', label: text.month },
    { key: 'quarter', label: text.quarter },
    { key: 'year', label: text.year },
    { key: 'all', label: text.allTime },
  ];

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let query = supabase
    .from('orders')
    .select(
      'id, invoice_number, invoice_issued_at, service_date, custom_service_title, service_id, custom_price, client_id, invoice_sent_at, invoice_snapshot_json, correction_of_order_id'
    )
    .eq('user_id', user!.id)
    .is('deleted_at', null)
    .not('invoice_number', 'is', null)
    .order('invoice_issued_at', { ascending: false });

  if (activePeriod !== 'all') {
    query = query
      .gte('invoice_issued_at', range.from.toISOString())
      .lte('invoice_issued_at', range.to.toISOString());
  }

  const { data, error } = await query;
  let invoices = (data ?? []) as InvoiceRow[];

  const clientIds = [...new Set(invoices.map((invoice) => invoice.client_id))];
  const clientMap = new Map<string, string>();
  if (clientIds.length > 0) {
    const { data: clients } = await supabase.from('clients').select('id, full_name').in('id', clientIds);
    for (const client of clients ?? []) {
      clientMap.set(client.id, client.full_name);
    }
  }

  const serviceIds = [...new Set(invoices.filter((invoice) => invoice.service_id).map((invoice) => invoice.service_id!))];
  const servicePriceMap = new Map<string, number>();
  const serviceTitleMap = new Map<string, string>();

  if (serviceIds.length > 0) {
    const { data: services } = await supabase
      .from('services')
      .select('id, title, default_price')
      .in('id', serviceIds);

    for (const service of services ?? []) {
      serviceTitleMap.set(service.id, service.title);
      if (service.default_price !== null) {
        servicePriceMap.set(service.id, Number(service.default_price));
      }
    }
  }

  if (search) {
    const normalizedQuery = search.toLowerCase();
    invoices = invoices.filter((invoice) => {
      const snapshot = isInvoiceSnapshot(invoice.invoice_snapshot_json) ? invoice.invoice_snapshot_json : null;
      const invoiceNumber = invoice.invoice_number.toLowerCase();
      const clientName = (snapshot?.client.full_name ?? clientMap.get(invoice.client_id) ?? '').toLowerCase();
      const serviceName = (
        snapshot?.order.service_title ??
        (invoice.service_id
          ? serviceTitleMap.get(invoice.service_id) ?? invoice.custom_service_title ?? ''
          : invoice.custom_service_title ?? '')
      ).toLowerCase();
      const price =
        snapshot?.order.price ??
        (invoice.custom_price !== null
          ? Number(invoice.custom_price)
          : invoice.service_id
            ? servicePriceMap.get(invoice.service_id) ?? 0
            : 0);
      const amountText = String(price).replace('.', ',').toLowerCase();

      return (
        invoiceNumber.includes(normalizedQuery) ||
        clientName.includes(normalizedQuery) ||
        serviceName.includes(normalizedQuery) ||
        amountText.includes(normalizedQuery)
      );
    });
  }

  const total = invoices.reduce((sum, invoice) => {
    const snapshot = isInvoiceSnapshot(invoice.invoice_snapshot_json) ? invoice.invoice_snapshot_json : null;
    const price =
      snapshot?.order.price ??
      (invoice.custom_price !== null
        ? Number(invoice.custom_price)
        : invoice.service_id
          ? servicePriceMap.get(invoice.service_id) ?? 0
          : 0);

    return sum + (price ?? 0);
  }, 0);

  const fromIso = activePeriod === 'all' ? null : range.from.toISOString();
  const toIso = activePeriod === 'all' ? null : range.to.toISOString();

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{text.title}</h1>
        <ExportButton from={fromIso} to={toIso} />
      </div>

      <p className="mb-4 text-sm text-neutral-500 dark:text-neutral-400">
        {text.periodDesc}: {range.label}
      </p>

      <div className="mb-4 flex flex-wrap gap-2">
        {periodButtons.map((button) => {
          const active = button.key === activePeriod;
          const params = new URLSearchParams();
          if (button.key !== 'all') params.set('period', button.key);
          if (search) params.set('q', search);

          return (
            <Link
              key={button.key}
              href={`/invoices${params.toString() ? `?${params}` : ''}`}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                active ? 'bg-blue-600 text-white' : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700'
              }`}
            >
              {button.label}
            </Link>
          );
        })}
      </div>

      <PeriodPicker
        targetPath="/invoices"
        currentPeriod={activePeriod}
        currentFrom={activePeriod === 'custom' ? from ?? null : null}
        currentTo={activePeriod === 'custom' ? to ?? null : null}
        currentMonth={currentMonth}
        monthOptions={monthOptions}
        monthParam="from"
        persistentParams={{
          q: search || null,
        }}
      />

      <form action="/invoices" className="mb-4">
        {activePeriod !== 'all' && <input type="hidden" name="period" value={activePeriod} />}
        {activePeriod === 'month' && currentMonth && <input type="hidden" name="from" value={currentMonth} />}
        {activePeriod === 'custom' && from && <input type="hidden" name="from" value={from} />}
        {activePeriod === 'custom' && to && <input type="hidden" name="to" value={to} />}
        <input
          type="text"
          name="q"
          defaultValue={search}
          placeholder={text.searchPlaceholder}
          className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-neutral-700 dark:bg-neutral-900"
        />
      </form>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
        <div className="flex items-center gap-2">
          <span className="text-xl">#</span>
          <div>
            <div className="text-xs uppercase tracking-wide text-neutral-600 dark:text-neutral-400">{text.summaryTitle}</div>
            <div className="text-sm text-amber-900 dark:text-amber-300">
              <span className="font-semibold">{invoices.length}</span> {getInvoiceLabel(invoices.length)}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs uppercase tracking-wide text-neutral-600 dark:text-neutral-400">{text.total}</div>
          <div className="text-2xl font-bold text-amber-700 dark:text-amber-300">{formatPrice(total)}</div>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
          {text.error}: {error.message}
        </div>
      )}

      {invoices.length === 0 ? (
        <EmptyState
          icon={search ? SearchX : FileText}
          title={search ? `${text.emptySearch} "${search}"` : text.emptyPeriod}
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
          <div className="hidden grid-cols-12 gap-2 border-b border-neutral-200 bg-neutral-50 px-4 py-2 text-xs font-medium text-neutral-500 sm:grid dark:border-neutral-800 dark:bg-neutral-800/50 dark:text-neutral-400">
            <div className="col-span-2">{text.number}</div>
            <div className="col-span-2">{text.date}</div>
            <div className="col-span-4">{text.client}</div>
            <div className="col-span-2">{text.service}</div>
            <div className="col-span-2 text-right">{text.amount}</div>
          </div>

          <ul>
            {invoices.map((invoice) => {
              const snapshot = isInvoiceSnapshot(invoice.invoice_snapshot_json) ? invoice.invoice_snapshot_json : null;
              const clientName = snapshot?.client.full_name ?? clientMap.get(invoice.client_id) ?? DASH;
              const serviceName =
                snapshot?.order.service_title ??
                (invoice.service_id
                  ? serviceTitleMap.get(invoice.service_id) ?? invoice.custom_service_title ?? DASH
                  : invoice.custom_service_title ?? DASH);
              const price =
                snapshot?.order.price ??
                (invoice.custom_price !== null
                  ? Number(invoice.custom_price)
                  : invoice.service_id
                    ? servicePriceMap.get(invoice.service_id) ?? null
                    : null);

              return (
                <li key={invoice.id} className="border-b border-neutral-100 last:border-b-0 dark:border-neutral-800">
                  <Link href={`/orders/${invoice.id}`} className="block transition hover:bg-neutral-50 dark:hover:bg-neutral-800">
                    <div className="p-4 sm:hidden">
                      <div className="mb-1 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-semibold text-blue-700 dark:text-blue-400">{invoice.invoice_number}</span>
                          {invoice.correction_of_order_id && (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                              {text.correction}
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-neutral-500 dark:text-neutral-400">{formatDate(invoice.invoice_issued_at)}</span>
                      </div>
                      <div className="truncate font-medium">{clientName}</div>
                      <div className="truncate text-sm text-neutral-500 dark:text-neutral-400">{serviceName}</div>
                      <div className="mt-1 font-semibold">{formatPrice(price)}</div>
                      {invoice.invoice_sent_at && (
                        <div className="mt-1 text-xs text-green-600 dark:text-green-400">
                          {text.sentAt} {formatDate(invoice.invoice_sent_at)}
                        </div>
                      )}
                    </div>

                    <div className="hidden grid-cols-12 items-center gap-2 px-4 py-3 text-sm sm:grid">
                      <div className="col-span-2 font-mono font-semibold text-blue-700 dark:text-blue-400">
                        <div className="flex items-center gap-2">
                          <span>{invoice.invoice_number}</span>
                          {invoice.correction_of_order_id && (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                              {text.correction}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="col-span-2 text-neutral-600 dark:text-neutral-400">{formatDate(invoice.invoice_issued_at)}</div>
                      <div className="col-span-4 truncate font-medium">
                        {clientName}
                        {invoice.invoice_sent_at && (
                          <span
                            className="ml-2 text-xs text-green-600 dark:text-green-400"
                            title={`${text.sentAt} ${formatDate(invoice.invoice_sent_at)}`}
                          >
                            OK
                          </span>
                        )}
                      </div>
                      <div className="col-span-2 truncate text-neutral-600 dark:text-neutral-400">{serviceName}</div>
                      <div className="col-span-2 text-right font-semibold">{formatPrice(price)}</div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="mt-4 rounded-lg bg-neutral-50 p-3 text-xs text-neutral-500 dark:bg-neutral-900 dark:text-neutral-400">{text.archiveNote}</div>
    </div>
  );
}
