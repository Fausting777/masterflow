import { isInvoiceLocked } from '@/lib/orders/invoice-lock';

type OrderPolicyFields = {
  invoice_number: string | null;
  invoice_locked_at: string | null;
  correction_of_order_id?: string | null;
  deleted_at?: string | null;
};

export function canEditOrder(order: OrderPolicyFields): boolean {
  return !isInvoiceLocked(order);
}

export function canMutateArchiveAssets(order: OrderPolicyFields): boolean {
  return !isInvoiceLocked(order);
}

export function canCreateCorrection(order: OrderPolicyFields): boolean {
  return Boolean(order.invoice_number) && !order.correction_of_order_id;
}
