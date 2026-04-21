'use client';

import { useState, useTransition } from 'react';
import { exportAuditTrailCsvAction } from '@/app/(dashboard)/settings/audit-actions';
import { useI18n } from '@/components/i18n/LocaleProvider';

export default function ExportAuditTrailButton() {
  const { locale } = useI18n();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const text =
    locale === 'de'
      ? {
          error: 'Exportfehler',
          export: 'Audit CSV exportieren',
          exporting: 'Export läuft...',
        }
      : {
          error: 'Ошибка экспорта',
          export: 'Экспорт аудита CSV',
          exporting: 'Экспорт...',
        };

  function handleExport() {
    setError(null);
    startTransition(async () => {
      const res = await exportAuditTrailCsvAction();
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
        className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-700 disabled:bg-green-400"
      >
        {isPending ? text.exporting : text.export}
      </button>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
