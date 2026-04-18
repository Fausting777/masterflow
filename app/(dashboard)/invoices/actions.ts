'use server';

import { createClient } from '@/lib/supabase/server';

export type InvoiceExportFilter = {
  from?: string | null;    // ISO
  to?: string | null;      // ISO
};

export async function exportInvoicesCsvAction(
  filter: InvoiceExportFilter
): Promise<{
  ok: boolean;
  csv?: string;
  filename?: string;
  error?: string;
}> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Не авторизован' };

  // Забираем все выставленные счета за период
  let query = supabase
    .from('orders')
    .select('id, invoice_number, invoice_issued_at, service_date, custom_service_title, service_id, custom_price, client_id, invoice_sent_at, invoice_sent_to')
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .not('invoice_number', 'is', null)
    .order('invoice_number', { ascending: true });

  if (filter.from) query = query.gte('invoice_issued_at', filter.from);
  if (filter.to) query = query.lte('invoice_issued_at', filter.to);

  const { data: orders, error } = await query;
  if (error) return { ok: false, error: error.message };
  if (!orders || orders.length === 0) {
    return { ok: false, error: 'Нет счетов в выбранном периоде' };
  }

  // Подтягиваем клиентов
  const clientIds = [...new Set(orders.map(o => o.client_id))];
  const { data: clients } = await supabase
    .from('clients')
    .select('id, full_name, phone, email, address, postal_code, city')
    .in('id', clientIds);
  const clientMap = new Map((clients ?? []).map(c => [c.id, c]));

  // Подтягиваем услуги (для тех, у кого service_id)
  const serviceIds = [...new Set(orders.filter(o => o.service_id).map(o => o.service_id!))];
  const serviceMap = new Map<string, { title: string; default_price: number | null }>();
  if (serviceIds.length > 0) {
    const { data: services } = await supabase
      .from('services')
      .select('id, title, default_price')
      .in('id', serviceIds);
    for (const s of services ?? []) {
      serviceMap.set(s.id, { title: s.title, default_price: Number(s.default_price) });
    }
  }

  // Формируем CSV
  // Разделитель — ";" (стандарт для немецкого Excel), десятичный — "," (немецкий формат)
  const headers = [
    'Rechnungsnummer',
    'Rechnungsdatum',
    'Leistungsdatum',
    'Kunde',
    'Telefon',
    'Email',
    'Adresse',
    'PLZ',
    'Ort',
    'Leistung',
    'Betrag',
    'Versendet am',
    'Versendet an',
  ];

  const rows = orders.map(o => {
    const client = clientMap.get(o.client_id);
    const service = o.service_id ? serviceMap.get(o.service_id) : null;
    const title = service?.title ?? o.custom_service_title ?? '';
    const price = o.custom_price !== null
      ? Number(o.custom_price)
      : (service?.default_price ?? 0);
    const priceStr = price.toFixed(2).replace('.', ','); // немецкий формат

    return [
      o.invoice_number ?? '',
      o.invoice_issued_at ? new Date(o.invoice_issued_at).toLocaleDateString('de-DE') : '',
      o.service_date ? new Date(o.service_date).toLocaleDateString('de-DE') : '',
      client?.full_name ?? '',
      client?.phone ?? '',
      client?.email ?? '',
      client?.address ?? '',
      client?.postal_code ?? '',
      client?.city ?? '',
      title,
      priceStr,
      o.invoice_sent_at ? new Date(o.invoice_sent_at).toLocaleDateString('de-DE') : '',
      o.invoice_sent_to ?? '',
    ];
  });

  // Экранирование: если в ячейке ";" или "\"" или "\n" — оборачиваем в кавычки, внутри кавычек удваиваем "
  const escape = (v: string) => {
    if (v.includes(';') || v.includes('"') || v.includes('\n')) {
      return `"${v.replace(/"/g, '""')}"`;
    }
    return v;
  };

  const lines = [
    headers.map(escape).join(';'),
    ...rows.map(r => r.map(c => escape(String(c))).join(';')),
  ];

  // BOM нужен, чтобы Excel понял UTF-8 с кириллицей и умляутами
  const csv = '\uFEFF' + lines.join('\r\n');

  // Имя файла с меткой периода
  const now = new Date();
  let label = 'all';
  if (filter.from && filter.to) {
    const fromD = new Date(filter.from);
    const toD = new Date(filter.to);
    label = `${fromD.toISOString().slice(0, 10)}_${toD.toISOString().slice(0, 10)}`;
  } else {
    label = now.toISOString().slice(0, 10);
  }
  const filename = `Rechnungen_${label}.csv`;

  return { ok: true, csv, filename };
}