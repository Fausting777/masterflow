'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import type { ServiceFormState } from '@/app/(dashboard)/services/actions';
import { useI18n } from '@/components/i18n/LocaleProvider';
import CsrfTokenInput from '@/components/security/CsrfTokenInput';

type Props = {
  action: (prev: ServiceFormState, fd: FormData) => Promise<ServiceFormState>;
  initial?: {
    title?: string | null;
    default_price?: number | null;
    description?: string | null;
  };
  cancelHref: string;
  submitLabel: string;
};

export default function ServiceForm({
  action,
  initial,
  cancelHref,
  submitLabel,
}: Props) {
  const [state, formAction, isPending] = useActionState<ServiceFormState, FormData>(action, {});
  const { t } = useI18n();

  const v = state.values ?? {
    title: initial?.title ?? '',
    default_price:
      initial?.default_price !== null && initial?.default_price !== undefined
        ? String(initial.default_price)
        : '',
    description: initial?.description ?? '',
  };

  const inputCls =
    'w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

  return (
    <form action={formAction} className="space-y-4">
      <CsrfTokenInput />
      <div>
        <label htmlFor="title" className="block text-sm font-medium mb-1">
          {t.serviceForm.title} <span className="text-red-500">*</span>
        </label>
        <input
          id="title"
          name="title"
          type="text"
          required
          defaultValue={v.title}
          placeholder={t.serviceForm.titlePlaceholder}
          className={inputCls}
        />
        {state.errors?.title && <p className="text-xs text-red-600 mt-1">{state.errors.title}</p>}
      </div>

      <div>
        <label htmlFor="default_price" className="block text-sm font-medium mb-1">
          {t.serviceForm.price}
        </label>
        <input
          id="default_price"
          name="default_price"
          type="text"
          inputMode="decimal"
          defaultValue={v.default_price}
          placeholder="80.00"
          className={inputCls}
        />
        {state.errors?.default_price && <p className="text-xs text-red-600 mt-1">{state.errors.default_price}</p>}
        <p className="text-xs text-neutral-500 mt-1">{t.serviceForm.priceHelp}</p>
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium mb-1">
          {t.serviceForm.description}
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          defaultValue={v.description}
          className={`${inputCls} resize-y`}
        />
        {state.errors?.description && <p className="text-xs text-red-600 mt-1">{state.errors.description}</p>}
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
          {isPending ? t.serviceForm.saving : submitLabel}
        </button>
        <Link
          href={cancelHref}
          className="rounded-lg border border-neutral-300 dark:border-neutral-700 px-4 py-2.5 text-sm font-medium hover:bg-neutral-50 dark:hover:bg-neutral-800"
        >
          {t.serviceForm.cancel}
        </Link>
      </div>
    </form>
  );
}
