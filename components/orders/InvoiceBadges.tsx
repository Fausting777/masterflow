import type { Order } from '@/types/database';

type Props = {
  invoiceNumber: Order['invoice_number'];
  invoiceSentAt: Order['invoice_sent_at'];
  compact?: boolean;
  locale?: 'ru' | 'de';
};

export default function InvoiceBadges({
  invoiceNumber,
  invoiceSentAt,
  compact = false,
  locale = 'de',
}: Props) {
  const hasInvoice = Boolean(invoiceNumber);
  const isSent = Boolean(invoiceSentAt);

  const text =
    locale === 'de'
      ? {
          missingTitle: 'Rechnung wurde noch nicht erstellt',
          missingLabel: 'Ohne Rechnung',
          invoiceTitle: `Rechnung ${invoiceNumber ?? ''}`.trim(),
          sentTitle: `Versendet ${new Date(invoiceSentAt ?? '').toLocaleDateString('de-DE')}`.trim(),
          invoiceShort: 'PDF',
          sentShort: 'Gesendet',
        }
      : {
          missingTitle: 'Счёт ещё не создан',
          missingLabel: 'Без счёта',
          invoiceTitle: `Счёт ${invoiceNumber ?? ''}`.trim(),
          sentTitle: `Отправлено ${new Date(invoiceSentAt ?? '').toLocaleDateString('ru-RU')}`.trim(),
          invoiceShort: 'PDF',
          sentShort: 'Отправлено',
        };

  if (!hasInvoice) {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full bg-neutral-100 font-medium text-neutral-600 ${
          compact ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs'
        }`}
        title={text.missingTitle}
      >
        {compact ? '!' : `! ${text.missingLabel}`}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1">
      <span
        className={`inline-flex items-center gap-1 rounded-full bg-green-100 font-medium text-green-800 ${
          compact ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs'
        }`}
        title={text.invoiceTitle}
      >
        {text.invoiceShort} {compact ? '' : invoiceNumber}
      </span>

      {isSent && (
        <span
          className={`inline-flex items-center gap-1 rounded-full bg-blue-100 font-medium text-blue-800 ${
            compact ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs'
          }`}
          title={text.sentTitle}
        >
          {compact ? 'Mail' : text.sentShort}
        </span>
      )}
    </span>
  );
}
