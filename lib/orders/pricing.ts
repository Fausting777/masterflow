import { isInvoiceSnapshot } from '@/lib/invoices/snapshot';

export type OrderPriceInput = {
  id: string;
  custom_price: number | null;
  service_id: string | null;
  invoice_snapshot_json: unknown;
};

export type OrderDateInput = {
  service_date: string | null;
  completed_at?: string | null;
  created_at: string;
};

export function effectiveOrderDate(o: OrderDateInput): Date {
  return new Date(o.service_date ?? o.completed_at ?? o.created_at);
}

export function resolveOrderPrice(
  o: OrderPriceInput,
  servicePrices: Map<string, number>,
  orderItemsTotals: Map<string, number>
): number | null {
  const snap = isInvoiceSnapshot(o.invoice_snapshot_json) ? o.invoice_snapshot_json : null;

  if (snap?.order.items && snap.order.items.length > 0) {
    return snap.order.items.reduce((sum, item) => sum + Number(item.price), 0);
  }
  if (snap?.order.price != null) {
    return Number(snap.order.price);
  }

  const itemsTotal = orderItemsTotals.get(o.id);
  if (itemsTotal !== undefined && itemsTotal > 0) {
    return itemsTotal;
  }

  if (o.custom_price !== null) {
    return Number(o.custom_price);
  }

  if (o.service_id) {
    return servicePrices.get(o.service_id) ?? null;
  }

  return null;
}

export function needsServicePriceLookup(o: OrderPriceInput): boolean {
  const snap = isInvoiceSnapshot(o.invoice_snapshot_json) ? o.invoice_snapshot_json : null;
  return !snap?.order.price && !(snap?.order.items?.length) && o.custom_price === null && Boolean(o.service_id);
}
