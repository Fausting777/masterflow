'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useI18n } from '@/components/i18n/LocaleProvider';

type Props = {
  targetPath?: string;
  currentPeriod: string;
  currentFrom: string | null;
  currentTo: string | null;
  currentMonth: string | null;
  monthOptions: Array<{ value: string; label: string }>;
  monthParam?: string;
  persistentParams?: Record<string, string | null | undefined>;
};

export default function PeriodPicker({
  targetPath = '/stats',
  currentPeriod,
  currentFrom,
  currentTo,
  currentMonth,
  monthOptions,
  monthParam = 'm',
  persistentParams,
}: Props) {
  const { locale } = useI18n();
  const router = useRouter();
  const [customFrom, setCustomFrom] = useState(currentPeriod === 'custom' ? currentFrom ?? '' : '');
  const [customTo, setCustomTo] = useState(currentPeriod === 'custom' ? currentTo ?? '' : '');

  const text =
    locale === 'de'
      ? {
          month: 'Monat',
          quarter: 'Quartal',
          year: 'Jahr',
          all: 'Alles',
          monthLabel: 'Monat:',
          select: 'auswaehlen',
          period: 'Zeitraum:',
          apply: 'Anwenden',
          applied: 'Aktiv',
        }
      : {
          month: 'Месяц',
          quarter: 'Квартал',
          year: 'Год',
          all: 'Все',
          monthLabel: 'Месяц:',
          select: 'выбрать',
          period: 'Период:',
          apply: 'Применить',
          applied: 'Активно',
        };

  const presets = [
    { key: 'month', label: text.month },
    { key: 'quarter', label: text.quarter },
    { key: 'year', label: text.year },
    { key: 'all', label: text.all },
  ];

  function buildBaseParams() {
    const params = new URLSearchParams();

    for (const [key, value] of Object.entries(persistentParams ?? {})) {
      if (value) {
        params.set(key, value);
      }
    }

    return params;
  }

  function pushParams(params: URLSearchParams) {
    const query = params.toString();
    router.push(`${targetPath}${query ? `?${query}` : ''}`);
  }

  function goPreset(key: string) {
    const params = buildBaseParams();
    params.set('period', key);
    params.delete('from');
    params.delete('to');
    params.delete(monthParam);
    pushParams(params);
  }

  function goMonth(value: string) {
    const params = buildBaseParams();
    params.set('period', 'month');
    params.delete('from');
    params.delete('to');
    params.delete(monthParam);

    if (value) {
      params.set(monthParam, value);
    }

    pushParams(params);
  }

  function applyCustom() {
    if (!customFrom || !customTo) return;

    const params = buildBaseParams();
    params.set('period', 'custom');
    params.set('from', customFrom);
    params.set('to', customTo);
    if (monthParam !== 'from') {
      params.delete(monthParam);
    }

    pushParams(params);
  }

  const isCustomActive = currentPeriod === 'custom';
  const isSpecificMonth = currentPeriod === 'month' && currentMonth;

  return (
    <div className="mb-6 space-y-3 rounded-xl border border-neutral-200 bg-white p-4">
      <div className="flex flex-wrap gap-2">
        {presets.map((preset) => {
          const active =
            preset.key === currentPeriod &&
            !isCustomActive &&
            !(preset.key === 'month' && isSpecificMonth);

          return (
            <button
              key={preset.key}
              type="button"
              onClick={() => goPreset(preset.key)}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                active
                  ? 'bg-blue-600 text-white'
                  : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
              }`}
            >
              {preset.label}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-2">
        <label className="whitespace-nowrap text-sm text-neutral-600">{text.monthLabel}</label>
        <select
          value={currentMonth ?? ''}
          onChange={(e) => goMonth(e.target.value)}
          className="flex-1 rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 sm:flex-none"
        >
          <option value="">{`- ${text.select} -`}</option>
          {monthOptions.map((month) => (
            <option key={month.value} value={month.value}>
              {month.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label className="whitespace-nowrap text-sm text-neutral-600">{text.period}</label>
        <input
          type="date"
          value={customFrom}
          onChange={(e) => setCustomFrom(e.target.value)}
          className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm"
        />
        <span className="text-neutral-400">-</span>
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
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
            isCustomActive
              ? 'bg-blue-600 text-white'
              : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200 disabled:opacity-50'
          }`}
        >
          {isCustomActive ? text.applied : text.apply}
        </button>
      </div>
    </div>
  );
}
