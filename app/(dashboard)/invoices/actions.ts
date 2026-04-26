'use server';

import { isInvoiceSnapshot } from '@/lib/invoices/snapshot';
import { escapeCsvCell } from '@/lib/security/csv';
import { createClient } from '@/lib/supabase/server';

export type InvoiceExportFilter = {
  from?: string | null;
  to?: string | null;
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
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Нет авторизации' };

  let query = supabase
    .from('orders')
    .select(
      'id, invoice_number, invoice_issued_at, service_date, custom_service_title, service_id, custom_price, client_id, invoice_sent_at, invoice_sent_to, invoice_snapshot_json, correction_of_order_id, pdf_file_path, pdf_sha256'
    )
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

  const clientIds = [...new Set(orders.map((order) => order.client_id))];
  const { data: clients } = await supabase
    .from('clients')
    .select('id, full_name, phone, email, address, postal_code, city')
    .in('id', clientIds);
  const clientMap = new Map((clients ?? []).map((client) => [client.id, client]));

  const serviceIds = [...new Set(orders.filter((order) => order.service_id).map((order) => order.service_id!))];
  const serviceMap = new Map<string, { title: string; default_price: number | null }>();
  if (serviceIds.length > 0) {
    const { data: services } = await supabase
      .from('services')
      .select('id, title, default_price')
      .in('id', serviceIds);
    for (const service of services ?? []) {
      serviceMap.set(service.id, {
        title: service.title,
        default_price: Number(service.default_price),
      });
    }
  }

  const sourceIds = [...new Set(orders.filter((order) => order.correction_of_order_id).map((order) => order.correction_of_order_id!))];
  const sourceInvoiceMap = new Map<string, string>();
  if (sourceIds.length > 0) {
    const { data: sourceOrders } = await supabase.from('orders').select('id, invoice_number').in('id', sourceIds);
    for (const sourceOrder of sourceOrders ?? []) {
      if (sourceOrder.invoice_number) sourceInvoiceMap.set(sourceOrder.id, sourceOrder.invoice_number);
    }
  }

  const headers = [
    'Dokumenttyp',
    'Rechnungsnummer',
    'Korrektur zu',
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
    'PDF-Pfad',
    'PDF-SHA256',
  ];

  const rows = orders.map((order) => {
    const snapshot = isInvoiceSnapshot(order.invoice_snapshot_json) ? order.invoice_snapshot_json : null;
    const client = clientMap.get(order.client_id);
    const service = order.service_id ? serviceMap.get(order.service_id) : null;

    const fullName = snapshot?.client.full_name ?? client?.full_name ?? '';
    const phone = snapshot?.client.phone ?? client?.phone ?? '';
    const email = snapshot?.client.email ?? client?.email ?? '';
    const address = snapshot?.client.address ?? client?.address ?? '';
    const postalCode = snapshot?.client.postal_code ?? client?.postal_code ?? '';
    const city = snapshot?.client.city ?? client?.city ?? '';
    const serviceTitle = snapshot?.order.service_title ?? service?.title ?? order.custom_service_title ?? '';
    const amount =
      snapshot?.order.price ??
      (order.custom_price !== null ? Number(order.custom_price) : service?.default_price ?? 0);
    const amountString = Number(amount ?? 0).toFixed(2).replace('.', ',');

    return [
      order.correction_of_order_id ? 'Rechnungskorrektur' : 'Rechnung',
      order.invoice_number ?? '',
      order.correction_of_order_id ? sourceInvoiceMap.get(order.correction_of_order_id) ?? '' : '',
      snapshot?.invoice_issued_at
        ? new Date(snapshot.invoice_issued_at).toLocaleDateString('de-DE')
        : order.invoice_issued_at
          ? new Date(order.invoice_issued_at).toLocaleDateString('de-DE')
          : '',
      snapshot?.order.service_date
        ? new Date(snapshot.order.service_date).toLocaleDateString('de-DE')
        : order.service_date
          ? new Date(order.service_date).toLocaleDateString('de-DE')
          : '',
      fullName,
      phone,
      email,
      address,
      postalCode,
      city,
      serviceTitle,
      amountString,
      order.invoice_sent_at ? new Date(order.invoice_sent_at).toLocaleDateString('de-DE') : '',
      order.invoice_sent_to ?? '',
      order.pdf_file_path ?? '',
      order.pdf_sha256 ?? '',
    ];
  });

  const lines = [
    headers.map(escapeCsvCell).join(';'),
    ...rows.map((row) => row.map((cell) => escapeCsvCell(String(cell))).join(';')),
  ];

  const csv = '\uFEFF' + lines.join('\r\n');
  const now = new Date();

  let label = now.toISOString().slice(0, 10);
  if (filter.from && filter.to) {
    const fromDate = new Date(filter.from);
    const toDate = new Date(filter.to);
    label = `${fromDate.toISOString().slice(0, 10)}_${toDate.toISOString().slice(0, 10)}`;
  }

  return {
    ok: true,
    csv,
    filename: `Rechnungen_${label}.csv`,
  };
}
