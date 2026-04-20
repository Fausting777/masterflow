import ExportButton from '@/components/invoices/ExportButton';
import { isInvoiceSnapshot } from '@/lib/invoices/snapshot';
import { createClient } from '@/lib/supabase/server';
import { getRange, type PeriodKey } from '@/lib/utils/date-range';
import { formatDate, formatPrice } from '@/lib/utils/format';
import Link from 'next/link';

type SearchParams = Promise<{
  period?: string;
  from?: string;
  to?: string;
  q?: string;
}>;

const PERIOD_BUTTONS: Array<{ key: PeriodKey; label: string }> = [
  { key: 'month', label: 'Месяц' },
  { key: 'quarter', label: 'Квартал' },
  { key: 'year', label: 'Год' },
  { key: 'all', label: 'Все время' },
];

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

export default async function InvoicesPage({ searchParams }: { searchParams: SearchParams }) {
  const { period, q } = await searchParams;
  const activePeriod = (period ?? 'year') as PeriodKey;
  const range = getRange(activePeriod);
  const search = (q ?? '').trim();

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
    query = query.gte('invoice_issued_at', range.from.toISOString()).lte('invoice_issued_at', range.to.toISOString());
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

  const serviceIds = [
    ...new Set(invoices.filter((invoice) => invoice.service_id && invoice.custom_price === null).map((invoice) => invoice.service_id!)),
  ];
  const servicePriceMap = new Map<string, number>();
  const serviceTitleMap = new Map<string, string>();
  if (serviceIds.length > 0) {
    const { data: services } = await supabase
      .from('services')
      .select('id, title, default_price')
      .in('id', serviceIds);
    for (const service of services ?? []) {
      if (service.default_price !== null) servicePriceMap.set(service.id, Number(service.default_price));
      serviceTitleMap.set(service.id, service.title);
    }
  }

  const allServiceIds = [...new Set(invoices.filter((invoice) => invoice.service_id).map((invoice) => invoice.service_id!))];
  if (allServiceIds.length > 0) {
    const { data: services } = await supabase.from('services').select('id, title').in('id', allServiceIds);
    for (const service of services ?? []) {
      serviceTitleMap.set(service.id, service.title);
    }
  }

  if (search) {
    const normalizedQuery = search.toLowerCase();
    invoices = invoices.filter((invoice) => {
      const snapshot = isInvoiceSnapshot(invoice.invoice_snapshot_json) ? invoice.invoice_snapshot_json : null;
      const invoiceNumber = invoice.invoice_number.toLowerCase();
      const clientName = (snapshot?.client.full_name ?? clientMap.get(invoice.client_id) ?? '').toLowerCase();
      return invoiceNumber.includes(normalizedQuery) || clientName.includes(normalizedQuery);
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
        <h1 className="text-2xl font-semibold">Счета</h1>
        <ExportButton from={fromIso} to={toIso} />
      </div>

      <p className="mb-4 text-sm text-neutral-500">Все выставленные счета за период: {range.label}</p>

      <div className="mb-4 flex flex-wrap gap-2">
        {PERIOD_BUTTONS.map((button) => {
          const active = button.key === activePeriod;
          const params = new URLSearchParams();
          params.set('period', button.key);
          if (search) params.set('q', search);
          return (
            <Link
              key={button.key}
              href={`/invoices?${params.toString()}`}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                active ? 'bg-blue-600 text-white' : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
              }`}
            >
              {button.label}
            </Link>
          );
        })}
      </div>

      <form action="/invoices" className="mb-4">
        <input type="hidden" name="period" value={activePeriod} />
        <input
          type="text"
          name="q"
          defaultValue={search}
          placeholder="Поиск по номеру счета или имени клиента..."
          className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </form>

      <div className="mb-4 rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-wide text-neutral-500">Итого ({invoices.length})</div>
            <div className="mt-1 text-2xl font-bold">{formatPrice(total)}</div>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          Ошибка: {error.message}
        </div>
      )}

      {invoices.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-300 p-8 text-center text-sm text-neutral-500">
          {search ? <>Ничего не найдено по запросу &quot;{search}&quot;</> : <>Нет выставленных счетов за этот период</>}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
          <div className="hidden grid-cols-12 gap-2 border-b border-neutral-200 bg-neutral-50 px-4 py-2 text-xs font-medium text-neutral-500 sm:grid">
            <div className="col-span-2">Номер</div>
            <div className="col-span-2">Дата</div>
            <div className="col-span-4">Клиент</div>
            <div className="col-span-2">Услуга</div>
            <div className="col-span-2 text-right">Сумма</div>
          </div>

          <ul>
            {invoices.map((invoice) => {
              const snapshot = isInvoiceSnapshot(invoice.invoice_snapshot_json) ? invoice.invoice_snapshot_json : null;
              const clientName = snapshot?.client.full_name ?? clientMap.get(invoice.client_id) ?? '—';
              const serviceName =
                snapshot?.order.service_title ??
                (invoice.service_id
                  ? serviceTitleMap.get(invoice.service_id) ?? invoice.custom_service_title ?? '—'
                  : invoice.custom_service_title ?? '—');
              const price =
                snapshot?.order.price ??
                (invoice.custom_price !== null
                  ? Number(invoice.custom_price)
                  : invoice.service_id
                    ? servicePriceMap.get(invoice.service_id) ?? null
                    : null);

              return (
                <li key={invoice.id} className="border-b border-neutral-100 last:border-b-0">
                  <Link href={`/orders/${invoice.id}`} className="block transition hover:bg-neutral-50">
                    <div className="p-4 sm:hidden">
                      <div className="mb-1 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-semibold text-blue-700">{invoice.invoice_number}</span>
                          {invoice.correction_of_order_id && (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800">
                              Korrektur
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-neutral-500">{formatDate(invoice.invoice_issued_at)}</span>
                      </div>
                      <div className="truncate font-medium">{clientName}</div>
                      <div className="truncate text-sm text-neutral-500">{serviceName}</div>
                      <div className="mt-1 font-semibold">{formatPrice(price)}</div>
                      {invoice.invoice_sent_at && (
                        <div className="mt-1 text-xs text-green-600">Отправлен {formatDate(invoice.invoice_sent_at)}</div>
                      )}
                    </div>

                    <div className="hidden grid-cols-12 items-center gap-2 px-4 py-3 text-sm sm:grid">
                      <div className="col-span-2 font-mono font-semibold text-blue-700">
                        <div className="flex items-center gap-2">
                          <span>{invoice.invoice_number}</span>
                          {invoice.correction_of_order_id && (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800">
                              Korrektur
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="col-span-2 text-neutral-600">{formatDate(invoice.invoice_issued_at)}</div>
                      <div className="col-span-4 truncate font-medium">
                        {clientName}
                        {invoice.invoice_sent_at && (
                          <span
                            className="ml-2 text-xs text-green-600"
                            title={`Отправлен ${formatDate(invoice.invoice_sent_at)}`}
                          >
                            ✓
                          </span>
                        )}
                      </div>
                      <div className="col-span-2 truncate text-neutral-600">{serviceName}</div>
                      <div className="col-span-2 text-right font-semibold">{formatPrice(price)}</div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="mt-4 rounded-lg bg-neutral-50 p-3 text-xs text-neutral-500">
        Архивные счета выводятся из invoice snapshot на момент выпуска. Корректировки отображаются отдельными документами и не
        заменяют исходный счет.
      </div>
    </div>
  );
}
