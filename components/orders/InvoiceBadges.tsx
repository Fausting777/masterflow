import type { Order } from '@/types/database';

type Props = {
  invoiceNumber: Order['invoice_number'];
  invoiceSentAt: Order['invoice_sent_at'];
  compact?: boolean;  // для узких мест, где надо покомпактнее
};

export default function InvoiceBadges({ invoiceNumber, invoiceSentAt, compact = false }: Props) {
  const hasInvoice = Boolean(invoiceNumber);
  const isSent = Boolean(invoiceSentAt);

  if (!hasInvoice) {
    // Нет счёта — показываем серый "без счёта"
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full bg-neutral-100 text-neutral-600 font-medium ${
          compact ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs'
        }`}
        title="Счёт ещё не выставлен"
      >
        {compact ? '○' : '○ без счёта'}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1">
      {/* PDF готов */}
      <span
        className={`inline-flex items-center gap-1 rounded-full bg-green-100 text-green-800 font-medium ${
          compact ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs'
        }`}
        title={`Счёт ${invoiceNumber}`}
      >
        📄 {compact ? '' : invoiceNumber}
      </span>

      {/* Email отправлен — если да */}
      {isSent && (
        <span
          className={`inline-flex items-center gap-1 rounded-full bg-blue-100 text-blue-800 font-medium ${
            compact ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs'
          }`}
          title={`Отправлен ${new Date(invoiceSentAt!).toLocaleDateString('de-DE')}`}
        >
          ✉
        </span>
      )}
    </span>
  );
}