'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

type Props = {
  currentPeriod: string;
  currentFrom: string | null;
  currentTo: string | null;
  currentMonth: string | null;
  monthOptions: Array<{ value: string; label: string }>;
};

const PRESETS = [
  { key: 'month', label: 'Этот месяц' },
  { key: 'quarter', label: 'Квартал' },
  { key: 'year', label: 'Год' },
  { key: 'all', label: 'Всё' },
];

export default function PeriodPicker({
  currentPeriod,
  currentFrom,
  currentTo,
  currentMonth,
  monthOptions,
}: Props) {
  const router = useRouter();
  const [customFrom, setCustomFrom] = useState(currentFrom ?? '');
  const [customTo, setCustomTo] = useState(currentTo ?? '');

  function goPreset(key: string) {
    router.push(`/stats?period=${key}`);
  }

  function goMonth(value: string) {
    if (!value) {
      router.push('/stats?period=month');
      return;
    }
    router.push(`/stats?period=month&m=${value}`);
  }

  function applyCustom() {
    if (!customFrom || !customTo) return;
    router.push(`/stats?period=custom&from=${customFrom}&to=${customTo}`);
  }

  const isCustomActive = currentPeriod === 'custom';
  const isSpecificMonth = currentPeriod === 'month' && currentMonth;

  return (
    <div className="space-y-3 mb-6">
      {/* Быстрые пресеты */}
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => {
          // "Этот месяц" активен только если period=month без m
          const active =
            p.key === currentPeriod && !isCustomActive && !(p.key === 'month' && isSpecificMonth);
          return (
            <button
              key={p.key}
              type="button"
              onClick={() => goPreset(p.key)}
              className={`text-sm font-medium px-3 py-1.5 rounded-full transition ${
                active
                  ? 'bg-blue-600 text-white'
                  : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
              }`}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      {/* Выбор конкретного месяца */}
      <div className="flex items-center gap-2">
        <label className="text-sm text-neutral-600 whitespace-nowrap">Месяц:</label>
        <select
          value={currentMonth ?? ''}
          onChange={(e) => goMonth(e.target.value)}
          className="flex-1 sm:flex-none rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">— выбрать —</option>
          {monthOptions.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
      </div>

      {/* Произвольный период */}
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-sm text-neutral-600 whitespace-nowrap">Период:</label>
        <input
          type="date"
          value={customFrom}
          onChange={(e) => setCustomFrom(e.target.value)}
          className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm"
        />
        <span className="text-neutral-400">—</span>
        <input
          type="date"
          value={customTo}
          onChange={(e) => setCustomTo(e.target.value)}
          className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm"
        />
        <button
          type="button"
          onClick={applyCustom}
          disabled={!customFrom || !customTo}
          className={`text-sm font-medium px-3 py-1.5 rounded-lg transition ${
            isCustomActive
              ? 'bg-blue-600 text-white'
              : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200 disabled:opacity-50'
          }`}
        >
          {isCustomActive ? 'Применено' : 'Применить'}
        </button>
      </div>
    </div>
  );
}