import type { InvoiceData } from '@/lib/pdf/invoice';

export type InvoiceSnapshot = {
  kind: 'invoice_snapshot';
  version: number;
  created_at: string;
  order_id: string;
  invoice_number: string;
  invoice_issued_at: string;
  master: InvoiceData['master'];
  client: InvoiceData['client'];
  order: InvoiceData['order'];
};

export function createInvoiceSnapshot(input: {
  version?: number;
  createdAt: string;
  orderId: string;
  invoiceNumber: string;
  invoiceIssuedAt: string;
  master: InvoiceData['master'];
  client: InvoiceData['client'];
  order: InvoiceData['order'];
}): InvoiceSnapshot {
  return {
    kind: 'invoice_snapshot',
    version: input.version ?? 1,
    created_at: input.createdAt,
    order_id: input.orderId,
    invoice_number: input.invoiceNumber,
    invoice_issued_at: input.invoiceIssuedAt,
    master: input.master,
    client: input.client,
    order: input.order,
  };
}

export function isInvoiceSnapshot(value: unknown): value is InvoiceSnapshot {
  if (!value || typeof value !== 'object') return false;
  const snapshot = value as Record<string, unknown>;
  return (
    snapshot.kind === 'invoice_snapshot' &&
    typeof snapshot.order_id === 'string' &&
    typeof snapshot.invoice_number === 'string' &&
    typeof snapshot.invoice_issued_at === 'string'
  );
}

export function snapshotToInvoiceData(
  snapshot: InvoiceSnapshot,
  extras: {
    signature: Uint8Array | null;
    photosBefore: Uint8Array[];
    photosAfter: Uint8Array[];
  }
): InvoiceData {
  return {
    master: snapshot.master,
    client: snapshot.client,
    order: snapshot.order,
    signature: extras.signature,
    photosBefore: extras.photosBefore,
    photosAfter: extras.photosAfter,
  };
}
