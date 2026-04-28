type OrderLockFields = {
  invoice_number: string | null;
  invoice_locked_at: string | null;
};

export function isInvoiceLocked(order: OrderLockFields): boolean {
  return Boolean(order.invoice_number || order.invoice_locked_at);
}
