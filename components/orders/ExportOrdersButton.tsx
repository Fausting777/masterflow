'use client';

import { useState, useTransition } from 'react';
import { exportOrdersCsvAction, type OrdersExportFilter } from '@/app/(dashboard)/orders/export-actions';
import { useI18n } from '@/components/i18n/LocaleProvider';

type Props = {
  invoice: OrdersExportFilter['invoice'];
  month: string | null;
};

export default function ExportOrdersButton({ invoice, month }: Props) {
  const { locale } = useI18n();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const text =
    locale === 'de'
      ? {
          export: 'CSV exportieren',
          exporting: 'Export laeuft...',
          error: 'Exportfehler',
        }
      : {
          export: 'Экспорт CSV',
          exporting: 'Экспорт...',
          error: 'Ошибка экспорта',
        };

  function handleExport() {
    setError(null);
    startTransition(async () => {
      const res = await exportOrdersCsvAction({ invoice, month });
      if (!res.ok || !res.csv || !res.filename) {
        setError(res.error ?? text.error);
        return;
      }

      const blob = new Blob([res.csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = res.filename;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
    });
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleExport}
        disabled={isPending}
        className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-green-700 disabled:bg-green-400"
      >
        {isPending ? text.exporting : text.export}
      </button>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
