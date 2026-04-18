'use client';

import { formatPrice } from '@/lib/utils/format';

type Props = {
  months: Array<{ label: string; fullLabel: string }>;
  values: number[]; // parallel to months
};

export default function RevenueChart({ months, values }: Props) {
  const max = Math.max(...values, 1);
  const total = values.reduce((a, b) => a + b, 0);

  return (
    <div>
      <div className="text-xs text-neutral-500 mb-2">
        Последние 12 месяцев · Всего: <span className="font-semibold text-neutral-900">{formatPrice(total)}</span>
      </div>

      <div className="flex items-end gap-1 h-48 mt-4">
        {months.map((m, i) => {
          const v = values[i];
          const heightPct = max > 0 ? (v / max) * 100 : 0;
          const isZero = v === 0;
          return (
            <div
              key={i}
              className="flex-1 flex flex-col items-center gap-1 group relative"
              title={`${m.fullLabel}: ${formatPrice(v)}`}
            >
              <div
                className={`w-full rounded-t transition-all ${
                  isZero
                    ? 'bg-neutral-200'
                    : 'bg-gradient-to-t from-blue-600 to-blue-400 group-hover:from-blue-700 group-hover:to-blue-500'
                }`}
                style={{
                  height: isZero ? '3px' : `${Math.max(heightPct, 3)}%`,
                }}
              />
              <div className="text-[10px] text-neutral-500 truncate w-full text-center">
                {m.label}
              </div>
              {/* Tooltip на hover — только для ненулевых */}
              {!isZero && (
                <div className="absolute bottom-full mb-1 hidden group-hover:block bg-neutral-900 text-white text-[10px] rounded px-1.5 py-0.5 whitespace-nowrap z-10">
                  {formatPrice(v)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}