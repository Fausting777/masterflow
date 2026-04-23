'use client';

import Link from 'next/link';
import { useActionState, useRef, useState } from 'react';
import type { ExpenseFormState } from '@/app/(dashboard)/expenses/actions';
import { useI18n } from '@/components/i18n/LocaleProvider';
import CsrfTokenInput from '@/components/security/CsrfTokenInput';
import {
  getExpenseCategoryEmoji,
  getExpenseCategoryLabel,
} from '@/lib/utils/format';
import type { ExpenseCategory } from '@/types/database';

type OrderOption = {
  id: string;
  client_name: string;
  service_title: string;
  created_at: string;
};

type Props = {
  action: (prevState: ExpenseFormState, formData: FormData) => Promise<ExpenseFormState>;
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
  const [state, formAction, isPending] = useActionState<ExpenseFormState, FormData>(action, {});
  const { locale, t } = useI18n();

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
    'w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-neutral-700 dark:bg-neutral-900';

  return (
    <form action={formAction} className="space-y-4">
      <CsrfTokenInput />

      <div>
        <label htmlFor="category" className="mb-1 block text-sm font-medium">
          {t.expenseForm.category} <span className="text-red-500">*</span>
        </label>
        <select id="category" name="category" required defaultValue={v.category} className={inputCls}>
          <option value="">{t.expenseForm.select}</option>
          {CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {getExpenseCategoryEmoji(category)} {getExpenseCategoryLabel(category, locale)}
            </option>
          ))}
        </select>
        {state.errors?.category && <p className="mt-1 text-xs text-red-600">{state.errors.category}</p>}
      </div>

      <div>
        <label htmlFor="amount" className="mb-1 block text-sm font-medium">
          {t.expenseForm.amount} <span className="text-red-500">*</span>
        </label>
        <input
          id="amount"
          name="amount"
          type="text"
          inputMode="decimal"
          required
          defaultValue={v.amount}
          placeholder={t.expenseForm.amountPlaceholder}
          className={inputCls}
        />
        <p className="mt-1 text-xs text-neutral-500">{t.expenseForm.amountHelp}</p>
        {state.errors?.amount && <p className="mt-1 text-xs text-red-600">{state.errors.amount}</p>}
      </div>

      <div>
        <label htmlFor="expense_date" className="mb-1 block text-sm font-medium">
          {t.expenseForm.expenseDate} <span className="text-red-500">*</span>
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
          <p className="mt-1 text-xs text-red-600">{state.errors.expense_date}</p>
        )}
      </div>

      <div>
        <label htmlFor="vendor" className="mb-1 block text-sm font-medium">
          {t.expenseForm.vendor}
        </label>
        <input
          id="vendor"
          name="vendor"
          type="text"
          defaultValue={v.vendor}
          placeholder={t.expenseForm.vendorPlaceholder}
          className={inputCls}
        />
        {state.errors?.vendor && <p className="mt-1 text-xs text-red-600">{state.errors.vendor}</p>}
      </div>

      <div>
        <label htmlFor="description" className="mb-1 block text-sm font-medium">
          {t.expenseForm.description}
        </label>
        <textarea
          id="description"
          name="description"
          rows={2}
          defaultValue={v.description}
          placeholder={t.expenseForm.descriptionPlaceholder}
          className={`${inputCls} resize-y`}
        />
        {state.errors?.description && (
          <p className="mt-1 text-xs text-red-600">{state.errors.description}</p>
        )}
      </div>

      <div>
        <label htmlFor="order_id" className="mb-1 block text-sm font-medium">
          {t.expenseForm.orderLink}
        </label>
        <select id="order_id" name="order_id" defaultValue={v.order_id} className={inputCls}>
          <option value="">{t.expenseForm.noOrder}</option>
          {orders.map((order) => (
            <option key={order.id} value={order.id}>
              {order.client_name} · {order.service_title} ·{' '}
              {new Date(order.created_at).toLocaleDateString(locale === 'de' ? 'de-DE' : 'ru-RU')}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-neutral-500">{t.expenseForm.orderHelp}</p>
      </div>

      <div className="flex items-center gap-2">
        <input
          id="tax_deductible"
          name="tax_deductible"
          type="checkbox"
          defaultChecked={v.tax_deductible === 'on'}
          className="h-4 w-4"
        />
        <label htmlFor="tax_deductible" className="text-sm">
          {t.expenseForm.deductible}
        </label>
      </div>

      <div>
        <label htmlFor="receipt" className="mb-1 block text-sm font-medium">
          {t.expenseForm.receipt}
        </label>

        {receiptPreviewUrl && !newPreview && (
          <div className="mb-2">
            <div className="relative inline-block overflow-hidden rounded-lg border border-neutral-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={receiptPreviewUrl} alt={t.expensesPage.receiptAlt} className="max-h-48 object-contain" />
            </div>
            <p className="mt-1 text-xs text-neutral-500">{t.expenseForm.currentReceipt}</p>
          </div>
        )}

        {newPreview && (
          <div className="mb-2">
            <div className="relative inline-block overflow-hidden rounded-lg border border-neutral-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={newPreview} alt={t.expenseForm.newReceipt} className="max-h-48 object-contain" />
              <button
                type="button"
                onClick={clearFileInput}
                className="absolute right-1 top-1 rounded bg-black/60 px-2 py-0.5 text-xs text-white"
              >
                {t.expenseForm.remove}
              </button>
            </div>
          </div>
        )}

        <input
          ref={fileInputRef}
          id="receipt"
          name="receipt"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
          capture="environment"
          onChange={handleFileChange}
          className="block w-full text-sm text-neutral-700 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-100"
        />
        <p className="mt-1 text-xs text-neutral-500">{t.expenseForm.receiptHelp}</p>
      </div>

      {state.formError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {state.formError}
        </div>
      )}

      <div className="flex gap-2 pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="flex-1 rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:bg-blue-400"
        >
          {isPending ? t.expenseForm.saving : submitLabel}
        </button>
        <Link
          href={cancelHref}
          className="rounded-lg border border-neutral-300 px-4 py-2.5 text-sm font-medium hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
        >
          {t.expenseForm.cancel}
        </Link>
      </div>
    </form>
  );
}
