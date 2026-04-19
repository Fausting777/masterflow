'use client';

import { useActionState, useState, useRef } from 'react';
import Link from 'next/link';
import type { ExpenseFormState } from '@/app/(dashboard)/expenses/actions';
import {
  EXPENSE_CATEGORY_LABELS,
  EXPENSE_CATEGORY_EMOJIS,
} from '@/lib/utils/format';
import type { ExpenseCategory } from '@/types/database';

type OrderOption = {
  id: string;
  client_name: string;
  service_title: string;
  created_at: string;
};

type Props = {
  action: (
    prevState: ExpenseFormState,
    formData: FormData
  ) => Promise<ExpenseFormState>;
  initial?: {
    category?: ExpenseCategory | null;
    amount?: number | null;
    description?: string | null;
    vendor?: string | null;
    expense_date?: string | null;
    tax_deductible?: boolean;
    order_id?: string | null;
    receipt_file_path?: string | null;
  };
  receiptPreviewUrl?: string | null;
  orders: OrderOption[];
  cancelHref: string;
  submitLabel: string;
};

const CATEGORIES: ExpenseCategory[] = [
  'material',
  'fahrtkosten',
  'werkzeuge',
  'telefon_internet',
  'versicherung',
  'buero',
  'weiterbildung',
  'sonstiges',
];

// Сегодня в формате YYYY-MM-DD (для input type=date)
function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function ExpenseForm({
  action,
  initial,
  receiptPreviewUrl,
  orders,
  cancelHref,
  submitLabel,
}: Props) {
  const [state, formAction, isPending] = useActionState<ExpenseFormState, FormData>(
    action,
    {}
  );

  const v = state.values ?? {
    category: initial?.category ?? '',
    amount:
      initial?.amount !== null && initial?.amount !== undefined
        ? String(initial.amount).replace('.', ',')
        : '',
    description: initial?.description ?? '',
    vendor: initial?.vendor ?? '',
    expense_date: initial?.expense_date ?? todayIso(),
    tax_deductible: initial?.tax_deductible === false ? '' : 'on',
    order_id: initial?.order_id ?? '',
  };

  // Превью нового фото
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [newPreview, setNewPreview] = useState<string | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) {
      setNewPreview(null);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setNewPreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  function clearFileInput() {
    if (fileInputRef.current) fileInputRef.current.value = '';
    setNewPreview(null);
  }

  const inputCls =
    'w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

  return (
    <form action={formAction} className="space-y-4">
      {/* Категория */}
      <div>
        <label htmlFor="category" className="block text-sm font-medium mb-1">
          Категория <span className="text-red-500">*</span>
        </label>
        <select
          id="category"
          name="category"
          required
          defaultValue={v.category}
          className={inputCls}
        >
          <option value="">— выберите —</option>
          {CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {EXPENSE_CATEGORY_EMOJIS[cat]} {EXPENSE_CATEGORY_LABELS[cat]}
            </option>
          ))}
        </select>
        {state.errors?.category && (
          <p className="text-xs text-red-600 mt-1">{state.errors.category}</p>
        )}
      </div>

      {/* Сумма */}
      <div>
        <label htmlFor="amount" className="block text-sm font-medium mb-1">
          Сумма, € <span className="text-red-500">*</span>
        </label>
        <input
          id="amount"
          name="amount"
          type="text"
          inputMode="decimal"
          required
          defaultValue={v.amount}
          placeholder="например, 45,80"
          className={inputCls}
        />
        <p className="text-xs text-neutral-500 mt-1">
          Можно с запятой (45,80) или точкой (45.80)
        </p>
        {state.errors?.amount && (
          <p className="text-xs text-red-600 mt-1">{state.errors.amount}</p>
        )}
      </div>

      {/* Дата расхода */}
      <div>
        <label htmlFor="expense_date" className="block text-sm font-medium mb-1">
          Дата расхода <span className="text-red-500">*</span>
        </label>
        <input
          id="expense_date"
          name="expense_date"
          type="date"
          required
          defaultValue={v.expense_date}
          className={inputCls}
        />
        {state.errors?.expense_date && (
          <p className="text-xs text-red-600 mt-1">{state.errors.expense_date}</p>
        )}
      </div>

      {/* Продавец */}
      <div>
        <label htmlFor="vendor" className="block text-sm font-medium mb-1">
          Где купил / кому платил
        </label>
        <input
          id="vendor"
          name="vendor"
          type="text"
          defaultValue={v.vendor}
          placeholder="Bauhaus, OBI, Vodafone..."
          className={inputCls}
        />
        {state.errors?.vendor && (
          <p className="text-xs text-red-600 mt-1">{state.errors.vendor}</p>
        )}
      </div>

      {/* Описание */}
      <div>
        <label htmlFor="description" className="block text-sm font-medium mb-1">
          Описание
        </label>
        <textarea
          id="description"
          name="description"
          rows={2}
          defaultValue={v.description}
          placeholder="Что купил / за что заплатил"
          className={`${inputCls} resize-y`}
        />
        {state.errors?.description && (
          <p className="text-xs text-red-600 mt-1">{state.errors.description}</p>
        )}
      </div>

      {/* Привязка к заказу */}
      <div>
        <label htmlFor="order_id" className="block text-sm font-medium mb-1">
          Привязать к заказу (опционально)
        </label>
        <select
          id="order_id"
          name="order_id"
          defaultValue={v.order_id}
          className={inputCls}
        >
          <option value="">— не привязывать —</option>
          {orders.map((o) => (
            <option key={o.id} value={o.id}>
              {o.client_name} · {o.service_title} ·{' '}
              {new Date(o.created_at).toLocaleDateString('de-DE')}
            </option>
          ))}
        </select>
        <p className="text-xs text-neutral-500 mt-1">
          Если расход был для конкретной работы — можно привязать
        </p>
      </div>

      {/* Налоговый вычет */}
      <div className="flex items-center gap-2">
        <input
          id="tax_deductible"
          name="tax_deductible"
          type="checkbox"
          defaultChecked={v.tax_deductible === 'on'}
          className="w-4 h-4"
        />
        <label htmlFor="tax_deductible" className="text-sm">
          Учитывать при налоговом вычете
        </label>
      </div>

      {/* Чек */}
      <div>
        <label htmlFor="receipt" className="block text-sm font-medium mb-1">
          Фото чека
        </label>

        {/* Текущее фото (если есть и новое не выбрано) */}
        {receiptPreviewUrl && !newPreview && (
          <div className="mb-2">
            <div className="relative rounded-lg border border-neutral-200 overflow-hidden inline-block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={receiptPreviewUrl}
                alt="Чек"
                className="max-h-48 object-contain"
              />
            </div>
            <p className="text-xs text-neutral-500 mt-1">
              Текущий чек. Выбери новый файл — заменится.
            </p>
          </div>
        )}

        {/* Новое фото превью */}
        {newPreview && (
          <div className="mb-2">
            <div className="relative rounded-lg border border-neutral-200 overflow-hidden inline-block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={newPreview}
                alt="Новый чек"
                className="max-h-48 object-contain"
              />
              <button
                type="button"
                onClick={clearFileInput}
                className="absolute top-1 right-1 bg-black/60 text-white text-xs rounded px-2 py-0.5"
              >
                ✕ Убрать
              </button>
            </div>
          </div>
        )}

        <input
          ref={fileInputRef}
          id="receipt"
          name="receipt"
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          className="block w-full text-sm text-neutral-700 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />
        <p className="text-xs text-neutral-500 mt-1">
          📷 Сфотографируй чек для Finanzamt. Можно добавить позже.
        </p>
      </div>

      {state.formError && (
        <div className="rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 px-3 py-2 text-sm text-red-700 dark:text-red-300">
          {state.formError}
        </div>
      )}

      <div className="flex gap-2 pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="flex-1 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2.5 text-sm transition"
        >
          {isPending ? 'Сохранение...' : submitLabel}
        </button>
        <Link
          href={cancelHref}
          className="rounded-lg border border-neutral-300 dark:border-neutral-700 px-4 py-2.5 text-sm font-medium hover:bg-neutral-50 dark:hover:bg-neutral-800"
        >
          Отмена
        </Link>
      </div>
    </form>
  );
}