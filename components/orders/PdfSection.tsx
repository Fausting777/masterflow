'use client';

import { useState, useTransition } from 'react';
import {
  generatePdfAction,
  getPdfSignedUrlAction,
} from '@/app/(dashboard)/orders/[id]/pdf/actions';

type Props = {
  orderId: string;
  hasPdf: boolean;
};

export default function PdfSection({ orderId, hasPdf }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [pdfExists, setPdfExists] = useState(hasPdf);

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
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-green-700">
            <span>📄</span>
            <span>PDF-счёт готов</span>
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
              className="rounded-lg border border-neutral-300 px-4 py-2.5 text-sm font-medium hover:bg-neutral-50 disabled:opacity-50"
            >
              {isPending ? 'Пересоздание...' : 'Пересоздать'}
            </button>
          </div>
          <p className="text-xs text-neutral-500">
            Пересоздай PDF, если добавил фото или изменил данные
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

      {error && (
        <p className="text-xs text-red-600 mt-2">{error}</p>
      )}
    </div>
  );
}