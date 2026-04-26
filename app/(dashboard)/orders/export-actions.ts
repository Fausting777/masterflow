'use server';

import { isInvoiceSnapshot } from '@/lib/invoices/snapshot';
import { getLocale } from '@/lib/i18n/server';
import { escapeCsvCell } from '@/lib/security/csv';
import { createClient } from '@/lib/supabase/server';
import { getRange } from '@/lib/utils/date-range';
import { PAYMENT_METHOD_LABELS } from '@/lib/utils/format';
import type { OrderItem, OrderWithClient } from '@/types/database';

export type OrdersExportFilter = {
  invoice?: 'all' | 'with' | 'without' | 'sent';
  month?: string | null;
};

function effectiveDate(order: Pick<OrderWithClient, 'service_date' | 'completed_at' | 'created_at'>) {
  return new Date(order.service_date ?? order.completed_at ?? order.created_at);
}

function formatDate(value: string | null | undefined) {
  if (!value) return '';
  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value));
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return '';
  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function money(value: number | null | undefined) {
  if (value === null || value === undefined) return '';
  return Number(value).toFixed(2).replace('.', ',');
}

export async function exportOrdersCsvAction(
  filter: OrdersExportFilter
): Promise<{
  ok: boolean;
  csv?: string;
  filename?: string;
  error?: string;
}> {
  const locale = await getLocale();
  const text =
    locale === 'de'
      ? {
          unauthorized: 'Nicht autorisiert',
          empty: 'Keine Aufträge in der aktuellen Auswahl',
          yes: 'Ja',
          no: 'Nein',
          filename: 'Aufträge',
          filterAll: 'alle',
          filterWith: 'mit-quittung',
          filterWithout: 'ohne-quittung',
          filterSent: 'versendet',
        }
      : {
          unauthorized: 'Нет авторизации',
          empty: 'Нет заказов в текущей выборке',
          yes: 'Да',
          no: 'Нет',
          filename: 'Zakazy',
          filterAll: 'vse',
          filterWith: 's-kvitanciey',
          filterWithout: 'bez-kvitancii',
          filterSent: 'otpravlennye',
        };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, error: text.unauthorized };

  const invoiceFilter = filter.invoice ?? 'all';
  let query = supabase
    .from('orders_with_client')
    .select('*')
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (invoiceFilter === 'with') {
    query = query.not('invoice_number', 'is', null);
  } else if (invoiceFilter === 'without') {
    query = query.is('invoice_number', null);
  } else if (invoiceFilter === 'sent') {
    query = query.not('invoice_sent_at', 'is', null);
  }

  const { data, error } = await query;
  if (error) return { ok: false, error: error.message };

  let orders = ((data ?? []) as OrderWithClient[]).filter((order) => order.user_id === user.id);
  const monthRange = filter.month
    ? getRange('month', new Date(), { specificMonth: filter.month, locale })
    : null;

  if (monthRange) {
    orders = orders.filter((order) => {
      const time = effectiveDate(order).getTime();
      return time >= monthRange.from.getTime() && time <= monthRange.to.getTime();
    });
  }

  if (orders.length === 0) return { ok: false, error: text.empty };

  const servicesNeeded = [
    ...new Set(orders.filter((order) => order.custom_price === null && order.service_id).map((order) => order.service_id!)),
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
  const orderIds = orders.map((order) => order.id);
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

  const headers = [
    'Auftrag-ID',
    'Kunde',
    'Telefon',
    'Leistung',
    'Beschreibung',
    'Auftragsadresse',
    'Preis',
    'Status',
    'Effektives Datum',
    'Leistungsdatum',
    'Geplant für',
    'Abgeschlossen am',
    'Zahlungsart',
    'Bezahlt am',
    'Rechnungsnummer',
    'Rechnung ausgestellt am',
    'Rechnung versendet am',
    'Rechnung versendet an',
    'PDF-Pfad',
    'PDF-SHA256',
    'Erstellt am',
  ];

  const rows = orders.map((order) => {
    const snapshot = isInvoiceSnapshot(order.invoice_snapshot_json) ? order.invoice_snapshot_json : null;
    const snapshotItems = snapshot?.order.items;
    const orderItems = orderItemMap.get(order.id);
    let amount: number | null | undefined = null;
    if (snapshotItems && snapshotItems.length > 0) {
      amount = snapshotItems.reduce((sum, item) => sum + Number(item.price), 0);
    } else if (snapshot?.order.price !== undefined && snapshot.order.price !== null) {
      amount = Number(snapshot.order.price);
    } else if (orderItems && orderItems.length > 0) {
      amount = orderItems.reduce((sum, item) => sum + Number(item.price), 0);
    } else {
      amount =
        order.custom_price !== null
          ? Number(order.custom_price)
          : order.service_id
            ? servicePrices.get(order.service_id)
            : null;
    }
    const serviceTitle =
      snapshotItems && snapshotItems.length > 0
        ? snapshotItems.map((item) => item.title).join(' + ')
        : orderItems && orderItems.length > 0
          ? orderItems.map((item) => item.title).join(' + ')
          : snapshot?.order.service_title ?? order.custom_service_title ?? '';
    const paymentMethod = order.payment_method ? PAYMENT_METHOD_LABELS[order.payment_method] : '';

    return [
      order.id,
      order.client_name,
      order.client_phone ?? '',
      serviceTitle,
      order.description ?? '',
      order.order_address ?? '',
      money(amount),
      order.status,
      formatDate(effectiveDate(order).toISOString()),
      formatDate(order.service_date),
      formatDateTime(order.scheduled_at),
      formatDateTime(order.completed_at),
      paymentMethod,
      formatDateTime(order.paid_at),
      order.invoice_number ?? '',
      formatDate(order.invoice_issued_at),
      formatDateTime(order.invoice_sent_at),
      order.invoice_sent_to ?? '',
      order.pdf_file_path ?? '',
      order.pdf_sha256 ?? '',
      formatDateTime(order.created_at),
    ];
  });

  const lines = [
    headers.map(escapeCsvCell).join(';'),
    ...rows.map((row) => row.map((cell) => escapeCsvCell(String(cell))).join(';')),
  ];

  const filterLabels = {
    all: text.filterAll,
    with: text.filterWith,
    without: text.filterWithout,
    sent: text.filterSent,
  };
  const suffix = [filterLabels[invoiceFilter], filter.month || new Date().toISOString().slice(0, 10)]
    .filter(Boolean)
    .join('_');

  return {
    ok: true,
    csv: '\uFEFF' + lines.join('\r\n'),
    filename: `${text.filename}_${suffix}.csv`,
  };
}
