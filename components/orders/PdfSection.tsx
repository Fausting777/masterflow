'use client';

import { useState, useTransition } from 'react';
import { generatePdfAction } from '@/app/(dashboard)/orders/[id]/pdf/actions';
import { useI18n } from '@/components/i18n/LocaleProvider';
import { formatDateTime } from '@/lib/utils/format';
import SendInvoiceDialog from './SendInvoiceDialog';

type Props = {
  orderId: string;
  hasPdf: boolean;
  invoiceNumber: string | null;
  clientEmail: string | null;
  clientName: string;
  masterName: string;
  invoiceSentAt: string | null;
  invoiceSentTo: string | null;
};

export default function PdfSection({
  orderId,
  hasPdf,
  invoiceNumber,
  clientEmail,
  clientName,
  masterName,
  invoiceSentAt,
  invoiceSentTo,
}: Props) {
  const { locale } = useI18n();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [pdfExists, setPdfExists] = useState(hasPdf);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isOpeningPdf, setIsOpeningPdf] = useState(false);

  const isIssued = Boolean(invoiceNumber);
  const text =
    locale === 'de'
      ? {
          genericError: 'Fehler',
          pdfUrlFailed: 'PDF konnte nicht geladen werden',
          ready: 'PDF-Rechnung ist bereit',
          openPdf: 'PDF oeffnen',
          downloadPdf: 'PDF herunterladen',
          regeneratePdf: 'PDF neu erzeugen',
          sendByEmail: 'An Kunden per E-Mail senden',
          lastSent: 'Zuletzt gesendet',
          draftLocked:
            'Nach Ausstellung der Rechnung ist das PDF fixiert. Eine Neuerzeugung ueber das Ursprungsdokument hinaus ist nicht mehr moeglich.',
          draftHint:
            'Vor Ausstellung der Rechnung kann das PDF neu erzeugt werden, wenn Daten geaendert oder Fotos hinzugefuegt wurden.',
          generating: 'PDF wird erzeugt...',
          generatePdf: 'PDF-Rechnung erzeugen',
          sentTo: 'an',
          readyIcon: 'OK',
          regenerateIcon: 'Neu',
        }
      : {
          genericError: 'Ошибка',
          pdfUrlFailed: 'Не удалось загрузить PDF',
          ready: 'PDF-квитанция готова',
          openPdf: 'Открыть PDF',
          downloadPdf: 'Скачать PDF',
          regeneratePdf: 'Пересоздать PDF',
          sendByEmail: 'Отправить клиенту на email',
          lastSent: 'Последняя отправка',
          draftLocked:
            'После выпуска квитанции PDF фиксируется. Пересоздать его поверх исходного документа больше нельзя.',
          draftHint:
            'До выпуска квитанции PDF можно пересоздать, если ты изменил данные или добавил фото.',
          generating: 'Генерация PDF...',
          generatePdf: 'Создать PDF-квитанцию',
          sentTo: 'на',
          readyIcon: 'OK',
          regenerateIcon: '↻',
        };

  function handleGenerate() {
    setError(null);
    startTransition(async () => {
      const res = await generatePdfAction(orderId);
      if (res.ok) {
        setPdfExists(true);
      } else {
        setError(res.error ?? text.genericError);
      }
    });
  }

  function openPdf() {
    setError(null);
    setIsOpeningPdf(true);
    window.location.assign(`/api/orders/${orderId}/pdf`);
    setIsOpeningPdf(false);
  }

  function downloadPdf() {
    setError(null);
    window.location.assign(`/api/orders/${orderId}/pdf?download=1`);
  }

  return (
    <div>
      {pdfExists ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-green-700">
            <span>{text.readyIcon}</span>
            <span>
              {text.ready}
              {invoiceNumber && ` - ${invoiceNumber}`}
            </span>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={openPdf}
              disabled={isOpeningPdf}
              className="flex-1 rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:bg-blue-400"
            >
              {text.openPdf}
            </button>
            <button
              type="button"
              onClick={downloadPdf}
              className="rounded-lg border border-neutral-300 px-4 py-2.5 text-sm font-medium hover:bg-neutral-50"
            >
              {text.downloadPdf}
            </button>
            {!isIssued && (
              <button
                type="button"
                onClick={handleGenerate}
                disabled={isPending}
                title={text.regeneratePdf}
                className="rounded-lg border border-neutral-300 px-4 py-2.5 text-sm font-medium hover:bg-neutral-50 disabled:opacity-50"
              >
                {isPending ? '...' : text.regenerateIcon}
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setDialogOpen(true)}
            className="w-full rounded-lg border border-blue-300 bg-blue-50 py-2.5 text-sm font-medium text-blue-700 transition hover:bg-blue-100"
          >
            {text.sendByEmail}
          </button>

          {invoiceSentAt && (
            <div className="rounded-lg bg-neutral-50 p-2 text-xs text-neutral-500">
              {text.lastSent}: {formatDateTime(invoiceSentAt, locale)}
              {invoiceSentTo && (
                <>
                  {' '}
                  {text.sentTo} <span className="font-medium">{invoiceSentTo}</span>
                </>
              )}
            </div>
          )}

          <p className="text-xs text-neutral-500">{isIssued ? text.draftLocked : text.draftHint}</p>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleGenerate}
          disabled={isPending}
          className="w-full rounded-lg border border-dashed border-neutral-300 px-4 py-3 text-sm font-medium text-neutral-700 transition hover:border-blue-500 hover:text-blue-600 disabled:opacity-50"
        >
          {isPending ? text.generating : text.generatePdf}
        </button>
      )}

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

      {dialogOpen && (
        <SendInvoiceDialog
          orderId={orderId}
          invoiceNumber={invoiceNumber}
          clientEmail={clientEmail}
          clientName={clientName}
          masterName={masterName}
          onClose={() => setDialogOpen(false)}
        />
      )}
    </div>
  );
}
