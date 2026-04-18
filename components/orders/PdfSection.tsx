'use client';

import { useState, useTransition } from 'react';
import {
  generatePdfAction,
  getPdfSignedUrlAction,
} from '@/app/(dashboard)/orders/[id]/pdf/actions';
import SendInvoiceDialog from './SendInvoiceDialog';
import { formatDateTime } from '@/lib/utils/format';

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
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [pdfExists, setPdfExists] = useState(hasPdf);
  const [dialogOpen, setDialogOpen] = useState(false);

  function handleGenerate() {
    setError(null);
    startTransition(async () => {
      const res = await generatePdfAction(orderId);
      if (res.ok) {
        setPdfExists(true);
      } else {
        setError(res.error ?? 'Ошибка');
      }
    });
  }

  async function openPdf() {
    setError(null);
    const res = await getPdfSignedUrlAction(orderId);
    if (res.url) {
      window.open(res.url, '_blank');
    } else {
      setError(res.error ?? 'Не удалось получить ссылку');
    }
  }

  return (
    <div>
      {pdfExists ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-green-700">
            <span>📄</span>
            <span>PDF-счёт готов{invoiceNumber && ` — ${invoiceNumber}`}</span>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={openPdf}
              className="flex-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 text-sm transition"
            >
              Открыть PDF
            </button>
            <button
              type="button"
              onClick={handleGenerate}
              disabled={isPending}
              title="Пересоздать PDF"
              className="rounded-lg border border-neutral-300 px-4 py-2.5 text-sm font-medium hover:bg-neutral-50 disabled:opacity-50"
            >
              {isPending ? '...' : '⟳'}
            </button>
          </div>

          <button
            type="button"
            onClick={() => setDialogOpen(true)}
            className="w-full rounded-lg border border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 font-medium py-2.5 text-sm transition"
          >
            📧 Отправить клиенту на email
          </button>

          {invoiceSentAt && (
            <div className="text-xs text-neutral-500 bg-neutral-50 rounded-lg p-2">
              Последняя отправка: {formatDateTime(invoiceSentAt)}
              {invoiceSentTo && <> на <span className="font-medium">{invoiceSentTo}</span></>}
            </div>
          )}

          <p className="text-xs text-neutral-500">
            Пересоздай PDF (⟳), если добавил фото или изменил данные
          </p>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleGenerate}
          disabled={isPending}
          className="w-full rounded-lg border border-dashed border-neutral-300 px-4 py-3 text-sm font-medium text-neutral-700 hover:border-blue-500 hover:text-blue-600 disabled:opacity-50 transition"
        >
          {isPending ? 'Генерация PDF...' : '📄 Создать PDF-счёт'}
        </button>
      )}

      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}

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