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
          exportShort: 'CSV',
          exporting: 'Export...',
          error: 'Exportfehler',
        }
      : {
          export: '\u042d\u043a\u0441\u043f\u043e\u0440\u0442 CSV',
          exportShort: 'CSV',
          exporting: '\u042d\u043a\u0441\u043f\u043e\u0440\u0442...',
          error: '\u041e\u0448\u0438\u0431\u043a\u0430 \u044d\u043a\u0441\u043f\u043e\u0440\u0442\u0430',
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
        className="inline-flex items-center rounded-lg bg-green-600 px-3 py-2 text-sm font-medium leading-none text-white transition hover:bg-green-700 disabled:bg-green-400"
      >
        {isPending ? (
          text.exporting
        ) : (
          <>
            <span className="sm:hidden">{text.exportShort}</span>
            <span className="hidden sm:inline">{text.export}</span>
          </>
        )}
      </button>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
