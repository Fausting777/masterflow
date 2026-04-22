'use client';

import { useState, useTransition } from 'react';
import {
  generatePdfAction,
  getPdfSignedUrlAction,
} from '@/app/(dashboard)/orders/[id]/pdf/actions';
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

  const isIssued = Boolean(invoiceNumber);
  const text =
    locale === 'de'
      ? {
          genericError: 'Fehler',
          pdfUrlFailed: 'Signierte PDF-URL konnte nicht geladen werden',
          ready: 'PDF-Rechnung ist bereit',
          openPdf: 'PDF Oeffnen',
          regeneratePdf: 'PDF neu erzeugen',
          sendByEmail: 'An Kunden per E-Mail senden',
          lastSent: 'Zuletzt gesendet',
          draftLocked:
            'Nach Ausstellung der Rechnung ist das PDF fixiert. Eine Neuerzeugung ueber das Ursprungsdokument hinaus ist nicht mehr moeglich.',
          draftHint:
            'Vor Ausstellung der Rechnung kann das PDF neu erzeugt werden, wenn Daten geaendert oder Fotos hinzugefuegt wurden.',
          generating: 'PDF wird erzeugt...',
          generatePdf: 'PDF-Rechnung erzeugen',
        }
      : {
          genericError: 'Ð Ñ›Ð¡â‚¬Ð Ñ‘Ð Â±Ð Ñ”Ð Â°',
          pdfUrlFailed: 'Ð ÑœÐ Âµ Ð¡Ñ“Ð Ò‘Ð Â°Ð Â»Ð Ñ•Ð¡ÐƒÐ¡ÐŠ Ð Ñ—Ð Ñ•Ð Â»Ð¡Ñ“Ð¡â€¡Ð Ñ‘Ð¡â€šÐ¡ÐŠ Ð¡ÐƒÐ¡ÐƒÐ¡â€¹Ð Â»Ð Ñ”Ð¡Ñ“',
          ready: 'PDF-Ð Ñ”Ð Ð†Ð Ñ‘Ð¡â€šÐ Â°Ð Ð…Ð¡â€ Ð Ñ‘Ð¡Ð Ð Ñ–Ð Ñ•Ð¡â€šÐ Ñ•Ð Ð†Ð Â°',
          openPdf: 'Ð Ñ›Ð¡â€šÐ Ñ”Ð¡Ð‚Ð¡â€¹Ð¡â€šÐ¡ÐŠ PDF',
          regeneratePdf: 'Ð ÑŸÐ ÂµÐ¡Ð‚Ð ÂµÐ¡ÐƒÐ Ñ•Ð Â·Ð Ò‘Ð Â°Ð¡â€šÐ¡ÐŠ PDF',
          sendByEmail: 'Ð Ñ›Ð¡â€šÐ Ñ—Ð¡Ð‚Ð Â°Ð Ð†Ð Ñ‘Ð¡â€šÐ¡ÐŠ Ð Ñ”Ð Â»Ð Ñ‘Ð ÂµÐ Ð…Ð¡â€šÐ¡Ñ“ Ð Ð…Ð Â° email',
          lastSent: 'Ð ÑŸÐ Ñ•Ð¡ÐƒÐ Â»Ð ÂµÐ Ò‘Ð Ð…Ð¡ÐÐ¡Ð Ð Ñ•Ð¡â€šÐ Ñ—Ð¡Ð‚Ð Â°Ð Ð†Ð Ñ”Ð Â°',
          draftLocked:
            'Ð ÑŸÐ Ñ•Ð¡ÐƒÐ Â»Ð Âµ Ð Ð†Ð¡â€¹Ð Ñ—Ð¡Ñ“Ð¡ÐƒÐ Ñ”Ð Â° Ð Ñ”Ð Ð†Ð Ñ‘Ð¡â€šÐ Â°Ð Ð…Ð¡â€ Ð Ñ‘Ð Ñ‘ PDF Ð¡â€žÐ Ñ‘Ð Ñ”Ð¡ÐƒÐ Ñ‘Ð¡Ð‚Ð¡Ñ“Ð ÂµÐ¡â€šÐ¡ÐƒÐ¡Ð. Ð ÑŸÐ ÂµÐ¡Ð‚Ð ÂµÐ¡ÐƒÐ Ñ•Ð Â·Ð Ò‘Ð Â°Ð Ð†Ð Â°Ð¡â€šÐ¡ÐŠ Ð ÂµÐ Ñ–Ð Ñ• Ð Ñ—Ð Ñ•Ð Ð†Ð ÂµÐ¡Ð‚Ð¡â€¦ Ð Ñ‘Ð¡ÐƒÐ¡â€¦Ð Ñ•Ð Ò‘Ð Ð…Ð Ñ•Ð Ñ–Ð Ñ• Ð Ò‘Ð Ñ•Ð Ñ”Ð¡Ñ“Ð Ñ˜Ð ÂµÐ Ð…Ð¡â€šÐ Â° Ð Â±Ð Ñ•Ð Â»Ð¡ÐŠÐ¡â‚¬Ð Âµ Ð Ð…Ð ÂµÐ Â»Ð¡ÐŠÐ Â·Ð¡Ð.',
          draftHint:
            'Ð â€Ð Ñ• Ð Ð†Ð¡â€¹Ð Ñ—Ð¡Ñ“Ð¡ÐƒÐ Ñ”Ð Â° Ð Ñ”Ð Ð†Ð Ñ‘Ð¡â€šÐ Â°Ð Ð…Ð¡â€ Ð Ñ‘Ð Ñ‘ PDF Ð Ñ˜Ð Ñ•Ð Â¶Ð Ð…Ð Ñ• Ð Ñ—Ð ÂµÐ¡Ð‚Ð ÂµÐ¡ÐƒÐ Ñ•Ð Â·Ð Ò‘Ð Â°Ð¡â€šÐ¡ÐŠ, Ð ÂµÐ¡ÐƒÐ Â»Ð Ñ‘ Ð¡â€šÐ¡â€¹ Ð Ñ‘Ð Â·Ð Ñ˜Ð ÂµÐ Ð…Ð Ñ‘Ð Â» Ð Ò‘Ð Â°Ð Ð…Ð Ð…Ð¡â€¹Ð Âµ Ð Ñ‘Ð Â»Ð Ñ‘ Ð Ò‘Ð Ñ•Ð Â±Ð Â°Ð Ð†Ð Ñ‘Ð Â» Ð¡â€žÐ Ñ•Ð¡â€šÐ Ñ•.',
          generating: 'Ð â€œÐ ÂµÐ Ð…Ð ÂµÐ¡Ð‚Ð Â°Ð¡â€ Ð Ñ‘Ð¡Ð PDF...',
          generatePdf: 'Ð ÐŽÐ Ñ•Ð Â·Ð Ò‘Ð Â°Ð¡â€šÐ¡ÐŠ PDF-Ð Ñ”Ð Ð†Ð Ñ‘Ð¡â€šÐ Â°Ð Ð…Ð¡â€ Ð Ñ‘Ð¡Ð‹',
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

  async function openPdf() {
    setError(null);
    const res = await getPdfSignedUrlAction(orderId);
    if (res.url) {
      window.open(res.url, '_blank');
    } else {
      setError(res.error ?? text.pdfUrlFailed);
    }
  }

  return (
    <div>
      {pdfExists ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-green-700">
            <span>Ð²Ñšâ€œ</span>
            <span>
              {text.ready}
              {invoiceNumber && ` - ${invoiceNumber}`}
            </span>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={openPdf}
              className="flex-1 rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700"
            >
              {text.openPdf}
            </button>
            {!isIssued && (
              <button
                type="button"
                onClick={handleGenerate}
                disabled={isPending}
                title={text.regeneratePdf}
                className="rounded-lg border border-neutral-300 px-4 py-2.5 text-sm font-medium hover:bg-neutral-50 disabled:opacity-50"
              >
                {isPending ? '...' : 'Ð²â€ Â»'}
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
                  {locale === 'de' ? 'an' : 'Ð Ð…Ð Â°'} <span className="font-medium">{invoiceSentTo}</span>
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
