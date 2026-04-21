export type PeriodKey = 'month' | 'quarter' | 'year' | 'all' | 'custom';

export type DateRange = {
  from: Date;
  to: Date;
  label: string;
};

type UiLocale = 'ru' | 'de';

function toLocaleTag(locale: UiLocale) {
  return locale === 'de' ? 'de-DE' : 'ru-RU';
}

export function getRange(
  period: PeriodKey,
  now = new Date(),
  options?: { from?: Date; to?: Date; specificMonth?: string; locale?: UiLocale }
): DateRange {
  const locale = options?.locale ?? 'ru';
  const localeTag = toLocaleTag(locale);
  const y = now.getFullYear();
  const m = now.getMonth();

  if (period === 'custom' && options?.from && options?.to) {
    return {
      from: options.from,
      to: options.to,
      label: formatRangeLabel(options.from, options.to, locale),
    };
  }

  if (period === 'month' && options?.specificMonth) {
    const [yStr, mStr] = options.specificMonth.split('-');
    const yy = parseInt(yStr);
    const mm = parseInt(mStr) - 1;
    if (!isNaN(yy) && !isNaN(mm)) {
      const from = new Date(yy, mm, 1, 0, 0, 0, 0);
      const to = new Date(yy, mm + 1, 0, 23, 59, 59, 999);
      return {
        from,
        to,
        label: from.toLocaleDateString(localeTag, { month: 'long', year: 'numeric' }),
      };
    }
  }

  if (period === 'month') {
    const from = new Date(y, m, 1, 0, 0, 0, 0);
    const to = new Date(y, m + 1, 0, 23, 59, 59, 999);
    return {
      from,
      to,
      label: from.toLocaleDateString(localeTag, { month: 'long', year: 'numeric' }),
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

  return {
    from: new Date(2000, 0, 1),
    to: new Date(y + 10, 0, 1),
    label: locale === 'de' ? 'Gesamter Zeitraum' : 'Все время',
  };
}

export function getPreviousRange(range: DateRange, locale: UiLocale = 'ru'): DateRange {
  const diff = range.to.getTime() - range.from.getTime();
  const to = new Date(range.from.getTime() - 1);
  const from = new Date(to.getTime() - diff);
  return {
    from,
    to,
    label: formatRangeLabel(from, to, locale),
  };
}

export function getLastMonths(
  count: number,
  now = new Date(),
  locale: UiLocale = 'ru'
): Array<{
  year: number;
  month: number;
  label: string;
  fullLabel: string;
  from: Date;
  to: Date;
}> {
  const localeTag = toLocaleTag(locale);
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
      label: d.toLocaleDateString(localeTag, { month: 'short' }).replace('.', ''),
      fullLabel: d.toLocaleDateString(localeTag, { month: 'long', year: 'numeric' }),
      from,
      to,
    });
  }
  return result;
}

export function getMonthOptions(
  startYear = 2024,
  now = new Date(),
  locale: UiLocale = 'ru'
): Array<{
  value: string;
  label: string;
}> {
  const localeTag = toLocaleTag(locale);
  const result: Array<{ value: string; label: string }> = [];
  const endYear = now.getFullYear();
  const endMonth = now.getMonth();

  for (let y = endYear; y >= startYear; y--) {
    const mStart = y === endYear ? endMonth : 11;
    const mEnd = 0;
    for (let m = mStart; m >= mEnd; m--) {
      const d = new Date(y, m, 1);
      result.push({
        value: `${y}-${String(m + 1).padStart(2, '0')}`,
        label: d.toLocaleDateString(localeTag, { month: 'long', year: 'numeric' }),
      });
    }
  }
  return result;
}

function formatRangeLabel(from: Date, to: Date, locale: UiLocale = 'ru'): string {
  const opts: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: 'numeric' };
  const localeTag = toLocaleTag(locale);
  return `${from.toLocaleDateString(localeTag, opts)} - ${to.toLocaleDateString(localeTag, opts)}`;
}

export function calculateChange(current: number, previous: number): {
  percent: number;
  direction: 'up' | 'down' | 'same';
  display: string;
} {
  if (previous === 0 && current === 0) {
    return { percent: 0, direction: 'same', display: '0%' };
  }
  if (previous === 0) {
    return { percent: 100, direction: 'up', display: '+100%' };
  }
  const percent = Math.round(((current - previous) / previous) * 100);
  if (percent === 0) return { percent: 0, direction: 'same', display: '0%' };
  if (percent > 0) return { percent, direction: 'up', display: `+${percent}%` };
  return { percent, direction: 'down', display: `${percent}%` };
}

export function toDateOnly(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
