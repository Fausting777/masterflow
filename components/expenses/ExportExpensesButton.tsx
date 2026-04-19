'use client';

import { useState, useTransition } from 'react';
import { exportExpensesCsvAction } from '@/app/(dashboard)/expenses/export-actions';

type Props = {
  fromDate: string;
  toDate: string;
  category: string;
};

export default function ExportExpensesButton({ fromDate, toDate, category }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleExport() {
    setError(null);
    startTransition(async () => {
      const res = await exportExpensesCsvAction({ fromDate, toDate, category });
      if (!res.ok || !res.csv || !res.filename) {
        setError(res.error ?? 'Ошибка экспорта');
        return;
      }

      const blob = new Blob([res.csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = res.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleExport}
        disabled={isPending}
        className="inline-flex items-center gap-2 rounded-lg bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white text-sm font-medium px-4 py-2 transition"
      >
        {isPending ? 'Экспорт...' : '📊 Экспорт CSV'}
      </button>
      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
    </div>
  );
}