'use client';

import { useState, useTransition } from 'react';
import { exportClientDataAction } from '@/app/(dashboard)/clients/[id]/dsgvo/actions';
import { useI18n } from '@/components/i18n/LocaleProvider';

type Props = { clientId: string };

export default function DsgvoExportButton({ clientId }: Props) {
  const { locale } = useI18n();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const text = locale === 'de'
    ? {
        label: 'Datenauskunft exportieren (Art. 15 / Art. 20 DSGVO)',
        hint: 'Lädt alle gespeicherten Daten dieses Kunden als CSV herunter.',
        loading: 'Wird erstellt...',
        error: 'Fehler beim Export',
      }
    : {
        label: 'Экспорт данных клиента (ст. 15 / ст. 20 DSGVO)',
        hint: 'Скачивает все сохранённые данные этого клиента в CSV.',
        loading: 'Создаётся...',
        error: 'Ошибка экспорта',
      };

  function handleExport() {
    setError(null);
    startTransition(async () => {
      const result = await exportClientDataAction(clientId);
      if (!result.ok || !result.csv) {
        setError(result.error ?? text.error);
        return;
      }
      const bom = '\uFEFF';
      const blob = new Blob([bom + result.csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = result.filename ?? 'dsgvo_export.csv';
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={handleExport}
        disabled={isPending}
        className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
      >
        {isPending ? text.loading : text.label}
      </button>
      <p className="text-xs text-neutral-500">{text.hint}</p>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
