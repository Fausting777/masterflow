'use client';

import { useI18n } from '@/components/i18n/LocaleProvider';
import { formatPrice } from '@/lib/utils/format';

type Props = {
  months: Array<{ label: string; fullLabel: string }>;
  values: number[];
  expenses?: number[];
};

export default function RevenueChart({ months, values, expenses }: Props) {
  const { locale } = useI18n();
  const hasExpenses = Boolean(expenses && expenses.length > 0);
  const allValues = hasExpenses ? [...values, ...(expenses ?? [])] : values;
  const max = Math.max(...allValues, 1);

  const totalRevenue = values.reduce((a, b) => a + b, 0);
  const totalExpenses = hasExpenses ? (expenses ?? []).reduce((a, b) => a + b, 0) : 0;

  const text =
    locale === 'de'
      ? {
          revenue: 'Einnahmen',
          expenses: 'Ausgaben',
          profit: 'Gewinn',
        }
      : {
          revenue: 'Доход',
          expenses: 'Расходы',
          profit: 'Прибыль',
        };

  return (
    <div>
      <div className="mb-2 flex items-center gap-4 text-xs">
        <div className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded bg-gradient-to-t from-blue-600 to-blue-400" />
          <span className="text-neutral-500">{text.revenue}:</span>
          <span className="font-semibold text-neutral-900">{formatPrice(totalRevenue)}</span>
        </div>
        {hasExpenses && (
          <div className="flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded bg-gradient-to-t from-rose-500 to-rose-300" />
            <span className="text-neutral-500">{text.expenses}:</span>
            <span className="font-semibold text-neutral-900">{formatPrice(totalExpenses)}</span>
          </div>
        )}
      </div>

      <div className="mt-4 flex h-48 items-end gap-1">
        {months.map((m, i) => {
          const v = values[i];
          const e = hasExpenses ? (expenses ?? [])[i] : 0;
          const hPctV = max > 0 ? (v / max) * 100 : 0;
          const hPctE = max > 0 ? (e / max) * 100 : 0;
          const isZeroV = v === 0;
          const isZeroE = e === 0;

          return (
            <div key={i} className="group relative flex flex-1 flex-col items-center gap-1">
              <div className="flex flex-1 items-end justify-center gap-0.5 w-full">
                <div
                  className={`flex-1 rounded-t transition-all ${
                    isZeroV
                      ? 'bg-neutral-200'
                      : 'bg-gradient-to-t from-blue-600 to-blue-400 group-hover:from-blue-700 group-hover:to-blue-500'
                  }`}
                  style={{ height: isZeroV ? '3px' : `${Math.max(hPctV, 3)}%` }}
                  title={`${m.fullLabel}: ${text.revenue} ${formatPrice(v)}`}
                />
                {hasExpenses && (
                  <div
                    className={`flex-1 rounded-t transition-all ${
                      isZeroE
                        ? 'bg-neutral-200'
                        : 'bg-gradient-to-t from-rose-500 to-rose-300 group-hover:from-rose-600 group-hover:to-rose-400'
                    }`}
                    style={{ height: isZeroE ? '3px' : `${Math.max(hPctE, 3)}%` }}
                    title={`${m.fullLabel}: ${text.expenses} ${formatPrice(e)}`}
                  />
                )}
              </div>
              <div className="w-full truncate text-center text-[10px] text-neutral-500">{m.label}</div>

              <div className="absolute bottom-full z-10 mb-1 hidden space-y-0.5 rounded bg-neutral-900 px-2 py-1 text-[10px] text-white whitespace-nowrap group-hover:block">
                <div>{m.fullLabel}</div>
                <div className="text-blue-300">
                  {text.revenue}: {formatPrice(v)}
                </div>
                {hasExpenses && (
                  <div className="text-rose-300">
                    {text.expenses}: {formatPrice(e)}
                  </div>
                )}
                {hasExpenses && (
                  <div className="font-semibold">
                    {text.profit}: {formatPrice(v - e)}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
