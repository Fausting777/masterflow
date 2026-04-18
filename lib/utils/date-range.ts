// lib/utils/date-range.ts

export type PeriodKey = 'month' | 'quarter' | 'year' | 'all';

export type DateRange = {
  from: Date;
  to: Date;
  label: string;
};

export function getRange(period: PeriodKey, now = new Date()): DateRange {
  const y = now.getFullYear();
  const m = now.getMonth();

  if (period === 'month') {
    const from = new Date(y, m, 1, 0, 0, 0, 0);
    const to = new Date(y, m + 1, 0, 23, 59, 59, 999);
    return {
      from,
      to,
      label: from.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' }),
    };
  }

  if (period === 'quarter') {
    const qStart = Math.floor(m / 3) * 3;
    const from = new Date(y, qStart, 1, 0, 0, 0, 0);
    const to = new Date(y, qStart + 3, 0, 23, 59, 59, 999);
    const qNum = Math.floor(qStart / 3) + 1;
    return { from, to, label: `Q${qNum} ${y}` };
  }

  if (period === 'year') {
    const from = new Date(y, 0, 1, 0, 0, 0, 0);
    const to = new Date(y, 11, 31, 23, 59, 59, 999);
    return { from, to, label: String(y) };
  }

  // all
  return {
    from: new Date(2000, 0, 1),
    to: new Date(y + 10, 0, 1),
    label: 'Всё время',
  };
}

// Последние N месяцев — массив от старого к новому
export function getLastMonths(count: number, now = new Date()): Array<{
  year: number;
  month: number; // 0-11
  label: string; // "окт"
  fullLabel: string; // "октябрь 2026"
  from: Date;
  to: Date;
}> {
  const result = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const y = d.getFullYear();
    const m = d.getMonth();
    const from = new Date(y, m, 1, 0, 0, 0, 0);
    const to = new Date(y, m + 1, 0, 23, 59, 59, 999);
    result.push({
      year: y,
      month: m,
      label: d.toLocaleDateString('ru-RU', { month: 'short' }).replace('.', ''),
      fullLabel: d.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' }),
      from,
      to,
    });
  }
  return result;
}