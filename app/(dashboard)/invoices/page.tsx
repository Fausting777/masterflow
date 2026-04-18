import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { formatPrice, formatDate } from '@/lib/utils/format';
import { getRange, type PeriodKey } from '@/lib/utils/date-range';
import ExportButton from '@/components/invoices/ExportButton';

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
  { key: 'all', label: 'Всё время' },
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
};

export default async function InvoicesPage({ searchParams }: { searchParams: SearchParams }) {
  const { period, q } = await searchParams;
  const activePeriod = (period ?? 'year') as PeriodKey; // по умолчанию — год
  const range = getRange(activePeriod);
  const search = (q ?? '').trim();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Получаем заказы с invoice_number
  let query = supabase
    .from('orders')
    .select('id, invoice_number, invoice_issued_at, service_date, custom_service_title, service_id, custom_price, client_id, invoice_sent_at')
    .eq('user_id', user!.id)
    .is('deleted_at', null)
    .not('invoice_number', 'is', null)
    .order('invoice_issued_at', { ascending: false });

  if (activePeriod !== 'all') {
    query = query.gte('invoice_issued_at', range.from.toISOString())
                 .lte('invoice_issued_at', range.to.toISOString());
  }

  const { data, error } = await query;
  let invoices = (data ?? []) as InvoiceRow[];

  // Подтягиваем клиентов (имена)
  const clientIds = [...new Set(invoices.map(i => i.client_id))];
  const clientMap = new Map<string, string>();
  if (clientIds.length > 0) {
    const { data: clients } = await supabase
      .from('clients')
      .select('id, full_name')
      .in('id', clientIds);
    for (const c of clients ?? []) {
      clientMap.set(c.id, c.full_name);
    }
  }

  // Подтягиваем цены услуг
  const serviceIds = [...new Set(invoices.filter(i => i.service_id && i.custom_price === null).map(i => i.service_id!))];
  const servicePriceMap = new Map<string, number>();
  const serviceTitleMap = new Map<string, string>();
  if (serviceIds.length > 0) {
    const { data: services } = await supabase
      .from('services')
      .select('id, title, default_price')
      .in('id', serviceIds);
    for (const s of services ?? []) {
      if (s.default_price !== null) servicePriceMap.set(s.id, Number(s.default_price));
      serviceTitleMap.set(s.id, s.title);
    }
  }

  // Тащим названия услуг и для тех, где цена кастомная (просто для отображения)
  const allServiceIds = [...new Set(invoices.filter(i => i.service_id).map(i => i.service_id!))];
  if (allServiceIds.length > 0) {
    const { data: services } = await supabase
      .from('services')
      .select('id, title')
      .in('id', allServiceIds);
    for (const s of services ?? []) {
      serviceTitleMap.set(s.id, s.title);
    }
  }

  // Фильтр по поиску (локально по собранным данным)
  if (search) {
    const q = search.toLowerCase();
    invoices = invoices.filter(i => {
      const num = i.invoice_number.toLowerCase();
      const clientName = (clientMap.get(i.client_id) ?? '').toLowerCase();
      return num.includes(q) || clientName.includes(q);
    });
  }

  // Считаем итог
  const total = invoices.reduce((sum, i) => {
    const price = i.custom_price !== null
      ? Number(i.custom_price)
      : (i.service_id ? servicePriceMap.get(i.service_id) ?? 0 : 0);
    return sum + price;
  }, 0);

  const fromIso = activePeriod === 'all' ? null : range.from.toISOString();
  const toIso = activePeriod === 'all' ? null : range.to.toISOString();

  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <h1 className="text-2xl font-semibold">Счета</h1>
        <ExportButton from={fromIso} to={toIso} />
      </div>

      <p className="text-sm text-neutral-500 mb-4">
        Все выставленные счета ({range.label})
      </p>

      {/* Переключатель периода */}
      <div className="flex flex-wrap gap-2 mb-4">
        {PERIOD_BUTTONS.map(p => {
          const active = p.key === activePeriod;
          const params = new URLSearchParams();
          params.set('period', p.key);
          if (search) params.set('q', search);
          return (
            <Link
              key={p.key}
              href={`/invoices?${params.toString()}`}
              className={`text-sm font-medium px-3 py-1.5 rounded-full transition ${
                active
                  ? 'bg-blue-600 text-white'
                  : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
              }`}
            >
              {p.label}
            </Link>
          );
        })}
      </div>

      {/* Поиск */}
      <form action="/invoices" className="mb-4">
        <input type="hidden" name="period" value={activePeriod} />
        <input
          type="text"
          name="q"
          defaultValue={search}
          placeholder="Поиск по номеру или имени клиента..."
          className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </form>

      {/* Итог */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-5 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-neutral-500 uppercase tracking-wide">
              Итого ({invoices.length} {invoices.length === 1 ? 'счёт' : invoices.length < 5 ? 'счёта' : 'счетов'})
            </div>
            <div className="text-2xl font-bold mt-1">{formatPrice(total)}</div>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700 mb-4">
          Ошибка: {error.message}
        </div>
      )}

      {/* Список */}
      {invoices.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-300 p-8 text-center text-sm text-neutral-500">
          {search ? (
            <>Ничего не найдено по запросу «{search}»</>
          ) : (
            <>Нет выставленных счетов в этом периоде</>
          )}
        </div>
      ) : (
        <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
          {/* Шапка для десктопа */}
          <div className="hidden sm:grid grid-cols-12 gap-2 px-4 py-2 bg-neutral-50 text-xs font-medium text-neutral-500 border-b border-neutral-200">
            <div className="col-span-2">Номер</div>
            <div className="col-span-2">Дата</div>
            <div className="col-span-4">Клиент</div>
            <div className="col-span-2">Услуга</div>
            <div className="col-span-2 text-right">Сумма</div>
          </div>

          <ul>
            {invoices.map(i => {
              const clientName = clientMap.get(i.client_id) ?? '—';
              const serviceName = i.service_id
                ? (serviceTitleMap.get(i.service_id) ?? i.custom_service_title ?? '—')
                : (i.custom_service_title ?? '—');
              const price = i.custom_price !== null
                ? Number(i.custom_price)
                : (i.service_id ? servicePriceMap.get(i.service_id) ?? null : null);

              return (
                <li key={i.id} className="border-b border-neutral-100 last:border-b-0">
                  <Link
                    href={`/orders/${i.id}`}
                    className="block hover:bg-neutral-50 transition"
                  >
                    {/* Мобильная версия — карточка */}
                    <div className="sm:hidden p-4">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono text-sm font-semibold text-blue-700">
                          {i.invoice_number}
                        </span>
                        <span className="text-xs text-neutral-500">
                          {formatDate(i.invoice_issued_at)}
                        </span>
                      </div>
                      <div className="font-medium truncate">{clientName}</div>
                      <div className="text-sm text-neutral-500 truncate">{serviceName}</div>
                      <div className="font-semibold mt-1">{formatPrice(price)}</div>
                      {i.invoice_sent_at && (
                        <div className="text-xs text-green-600 mt-1">
                          ✓ Отправлен {formatDate(i.invoice_sent_at)}
                        </div>
                      )}
                    </div>

                    {/* Десктопная версия — таблица */}
                    <div className="hidden sm:grid grid-cols-12 gap-2 px-4 py-3 items-center text-sm">
                      <div className="col-span-2 font-mono font-semibold text-blue-700">
                        {i.invoice_number}
                      </div>
                      <div className="col-span-2 text-neutral-600">
                        {formatDate(i.invoice_issued_at)}
                      </div>
                      <div className="col-span-4 font-medium truncate">
                        {clientName}
                        {i.invoice_sent_at && (
                          <span className="ml-2 text-xs text-green-600" title={`Отправлен ${formatDate(i.invoice_sent_at)}`}>
                            ✉
                          </span>
                        )}
                      </div>
                      <div className="col-span-2 text-neutral-600 truncate">{serviceName}</div>
                      <div className="col-span-2 font-semibold text-right">
                        {formatPrice(price)}
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="text-xs text-neutral-500 bg-neutral-50 rounded-lg p-3 mt-4">
        💡 CSV-файл открывается в Excel/Numbers/LibreOffice. Разделитель — точка с запятой, кодировка UTF-8. Формат чисел немецкий (запятая как десятичный разделитель).
      </div>
    </div>
  );
}