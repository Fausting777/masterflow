'use client';

import { formatPrice } from '@/lib/utils/format';

type Props = {
  months: Array<{ label: string; fullLabel: string }>;
  values: number[];       // доходы
  expenses?: number[];    // расходы (опционально)
};

export default function RevenueChart({ months, values, expenses }: Props) {
  const hasExpenses = Boolean(expenses && expenses.length > 0);
  const allValues = hasExpenses ? [...values, ...(expenses ?? [])] : values;
  const max = Math.max(...allValues, 1);

  const totalRevenue = values.reduce((a, b) => a + b, 0);
  const totalExpenses = hasExpenses ? (expenses ?? []).reduce((a, b) => a + b, 0) : 0;

  return (
    <div>
      <div className="flex items-center gap-4 text-xs mb-2">
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-gradient-to-t from-blue-600 to-blue-400 inline-block" />
          <span className="text-neutral-500">Доход:</span>
          <span className="font-semibold text-neutral-900">{formatPrice(totalRevenue)}</span>
        </div>
        {hasExpenses && (
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-gradient-to-t from-rose-500 to-rose-300 inline-block" />
            <span className="text-neutral-500">Расходы:</span>
            <span className="font-semibold text-neutral-900">{formatPrice(totalExpenses)}</span>
          </div>
        )}
      </div>

      <div className="flex items-end gap-1 h-48 mt-4">
        {months.map((m, i) => {
          const v = values[i];
          const e = hasExpenses ? (expenses ?? [])[i] : 0;
          const hPctV = max > 0 ? (v / max) * 100 : 0;
          const hPctE = max > 0 ? (e / max) * 100 : 0;
          const isZeroV = v === 0;
          const isZeroE = e === 0;

          return (
            <div
              key={i}
              className="flex-1 flex flex-col items-center gap-1 group relative"
            >
              {/* 2 столбца рядом */}
              <div className="w-full flex items-end justify-center gap-0.5 flex-1">
                <div
                  className={`flex-1 rounded-t transition-all ${
                    isZeroV
                      ? 'bg-neutral-200'
                      : 'bg-gradient-to-t from-blue-600 to-blue-400 group-hover:from-blue-700 group-hover:to-blue-500'
                  }`}
                  style={{ height: isZeroV ? '3px' : `${Math.max(hPctV, 3)}%` }}
                  title={`${m.fullLabel}: Доход ${formatPrice(v)}`}
                />
                {hasExpenses && (
                  <div
                    className={`flex-1 rounded-t transition-all ${
                      isZeroE
                        ? 'bg-neutral-200'
                        : 'bg-gradient-to-t from-rose-500 to-rose-300 group-hover:from-rose-600 group-hover:to-rose-400'
                    }`}
                    style={{ height: isZeroE ? '3px' : `${Math.max(hPctE, 3)}%` }}
                    title={`${m.fullLabel}: Расходы ${formatPrice(e)}`}
                  />
                )}
              </div>
              <div className="text-[10px] text-neutral-500 truncate w-full text-center">
                {m.label}
              </div>

              {/* Tooltip */}
              <div className="absolute bottom-full mb-1 hidden group-hover:block bg-neutral-900 text-white text-[10px] rounded px-2 py-1 whitespace-nowrap z-10 space-y-0.5">
                <div>{m.fullLabel}</div>
                <div className="text-blue-300">Доход: {formatPrice(v)}</div>
                {hasExpenses && (
                  <div className="text-rose-300">Расход: {formatPrice(e)}</div>
                )}
                {hasExpenses && (
                  <div className="font-semibold">Прибыль: {formatPrice(v - e)}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}