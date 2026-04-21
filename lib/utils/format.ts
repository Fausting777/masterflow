import type { ExpenseCategory, OrderStatus, PaymentMethod } from '@/types/database';

export type UiLocale = 'ru' | 'de';

export function formatPrice(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  }).format(value);
}

export function formatDate(value: string | null | undefined, locale: UiLocale = 'ru'): string {
  if (!value) return '—';
  return new Intl.DateTimeFormat(locale === 'de' ? 'de-DE' : 'ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value));
}

export function formatDateTime(
  value: string | null | undefined,
  locale: UiLocale = 'ru'
): string {
  if (!value) return '—';
  return new Intl.DateTimeFormat(locale === 'de' ? 'de-DE' : 'ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

export const STATUS_LABELS: Record<OrderStatus, string> = {
  new: 'Новый',
  in_progress: 'В работе',
  completed: 'Завершен',
  canceled: 'Отменен',
};

export function getStatusLabel(status: OrderStatus, locale: UiLocale): string {
  if (locale === 'de') {
    return {
      new: 'Neu',
      in_progress: 'In Arbeit',
      completed: 'Abgeschlossen',
      canceled: 'Abgebrochen',
    }[status];
  }

  return STATUS_LABELS[status];
}

export const STATUS_COLORS: Record<OrderStatus, string> = {
  new: 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300',
  in_progress: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950/50 dark:text-yellow-300',
  completed: 'bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-300',
  canceled: 'bg-neutral-200 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400',
};

export function parsePriceInput(raw: string): number | null {
  const cleaned = raw.trim().replace(',', '.');
  if (cleaned === '') return null;
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100) / 100;
}

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'Barzahlung',
  transfer: 'Ueberweisung',
  ec_card: 'EC-Karte',
  paypal: 'PayPal',
};

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  material: 'Material',
  fahrtkosten: 'Fahrtkosten',
  werkzeuge: 'Werkzeuge',
  telefon_internet: 'Telefon & Internet',
  versicherung: 'Versicherung',
  buero: 'Buero',
  weiterbildung: 'Weiterbildung',
  sonstiges: 'Sonstiges',
};

export function getExpenseCategoryLabel(category: ExpenseCategory, locale: UiLocale): string {
  if (locale === 'de') {
    return EXPENSE_CATEGORY_LABELS[category];
  }

  return {
    material: 'Материалы',
    fahrtkosten: 'Транспорт',
    werkzeuge: 'Инструменты',
    telefon_internet: 'Телефон и интернет',
    versicherung: 'Страховка',
    buero: 'Офис',
    weiterbildung: 'Обучение',
    sonstiges: 'Прочее',
  }[category];
}

export const EXPENSE_CATEGORY_EMOJIS: Record<ExpenseCategory, string> = {
  material: '📦',
  fahrtkosten: '🚗',
  werkzeuge: '🔧',
  telefon_internet: '📱',
  versicherung: '🛡',
  buero: '📝',
  weiterbildung: '📚',
  sonstiges: '📦',
};

export function getExpenseCategoryEmoji(category: ExpenseCategory): string {
  return EXPENSE_CATEGORY_EMOJIS[category];
}

export const EXPENSE_CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  material: 'bg-amber-100 text-amber-800',
  fahrtkosten: 'bg-red-100 text-red-800',
  werkzeuge: 'bg-blue-100 text-blue-800',
  telefon_internet: 'bg-purple-100 text-purple-800',
  versicherung: 'bg-green-100 text-green-800',
  buero: 'bg-neutral-100 text-neutral-800',
  weiterbildung: 'bg-indigo-100 text-indigo-800',
  sonstiges: 'bg-neutral-100 text-neutral-700',
};
