import type { Order } from '@/types/database';

type Props = {
  invoiceNumber: Order['invoice_number'];
  invoiceSentAt: Order['invoice_sent_at'];
  compact?: boolean;
};

export default function InvoiceBadges({ invoiceNumber, invoiceSentAt, compact = false }: Props) {
  const hasInvoice = Boolean(invoiceNumber);
  const isSent = Boolean(invoiceSentAt);

  if (!hasInvoice) {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full bg-neutral-100 font-medium text-neutral-600 ${
          compact ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs'
        }`}
        title="Квитанция ещё не выпущена"
      >
        {compact ? '○' : '○ без квитанции'}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1">
      <span
        className={`inline-flex items-center gap-1 rounded-full bg-green-100 font-medium text-green-800 ${
          compact ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs'
        }`}
        title={`Квитанция ${invoiceNumber}`}
      >
        📄 {compact ? '' : invoiceNumber}
      </span>

      {isSent && (
        <span
          className={`inline-flex items-center gap-1 rounded-full bg-blue-100 font-medium text-blue-800 ${
            compact ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs'
          }`}
          title={`Отправлена ${new Date(invoiceSentAt!).toLocaleDateString('de-DE')}`}
        >
          ✉
        </span>
      )}
    </span>
  );
}
