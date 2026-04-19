// lib/validators/expense.ts
import type { ExpenseCategory } from '@/types/database';

export type ExpenseInput = {
  category: string;           // но должно попасть в ExpenseCategory
  amount: string;             // строка из формы
  description: string;
  vendor: string;
  expense_date: string;       // YYYY-MM-DD
  tax_deductible: string;     // 'on' если чекбокс включён, иначе ''
  order_id: string;           // UUID или '' если не привязан
};

export type ExpenseValidationErrors = Partial<Record<keyof ExpenseInput, string>>;

const VALID_CATEGORIES: ExpenseCategory[] = [
  'material',
  'fahrtkosten',
  'werkzeuge',
  'telefon_internet',
  'versicherung',
  'buero',
  'weiterbildung',
  'sonstiges',
];

// Парсим немецкую запись суммы: "123,45" или "123.45" или "1 234,50"
export function parseAmount(input: string): number | null {
  const cleaned = input
    .trim()
    .replace(/\s/g, '')     // убираем пробелы (разделители тысяч)
    .replace(',', '.');      // немецкая запятая → точка
  if (cleaned === '') return null;
  const n = parseFloat(cleaned);
  if (isNaN(n) || n < 0) return null;
  return Math.round(n * 100) / 100;
}

export function validateExpense(data: ExpenseInput): ExpenseValidationErrors {
  const errors: ExpenseValidationErrors = {};

  if (!data.category.trim()) {
    errors.category = 'Выберите категорию';
  } else if (!VALID_CATEGORIES.includes(data.category as ExpenseCategory)) {
    errors.category = 'Некорректная категория';
  }

  const amount = parseAmount(data.amount);
  if (amount === null) {
    errors.amount = 'Укажите корректную сумму';
  } else if (amount === 0) {
    errors.amount = 'Сумма должна быть больше нуля';
  } else if (amount > 999999.99) {
    errors.amount = 'Слишком большая сумма';
  }

  if (!data.expense_date.trim()) {
    errors.expense_date = 'Укажите дату расхода';
  } else if (isNaN(Date.parse(data.expense_date))) {
    errors.expense_date = 'Некорректная дата';
  }

  if (data.description.length > 2000) {
    errors.description = 'Описание слишком длинное';
  }

  if (data.vendor.length > 200) {
    errors.vendor = 'Название продавца слишком длинное';
  }

  return errors;
}

export function normalizeExpenseInput(data: ExpenseInput) {
  const clean = (s: string) => {
    const t = s.trim();
    return t.length === 0 ? null : t;
  };

  return {
    category: data.category as ExpenseCategory,
    amount: parseAmount(data.amount)!,  // уже провалидировано выше
    description: clean(data.description),
    vendor: clean(data.vendor),
    expense_date: data.expense_date,
    tax_deductible: data.tax_deductible === 'on',
    order_id: data.order_id.trim() || null,
  };
}