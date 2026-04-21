'use client';

import { useActionState, useCallback, useState } from 'react';
import Link from 'next/link';
import type { ClientFormState } from '@/app/(dashboard)/clients/actions';
import PostalCodeLookup from '@/components/clients/PostalCodeLookup';
import { useI18n } from '@/components/i18n/LocaleProvider';
import CsrfTokenInput from '@/components/security/CsrfTokenInput';

type Props = {
  action: (prevState: ClientFormState, formData: FormData) => Promise<ClientFormState>;
  initial?: {
    full_name?: string | null;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    postal_code?: string | null;
    city?: string | null;
    note?: string | null;
  };
  cancelHref: string;
  submitLabel: string;
};

export default function ClientForm({
  action,
  initial,
  cancelHref,
  submitLabel,
}: Props) {
  const [state, formAction, isPending] = useActionState<ClientFormState, FormData>(action, {});
  const { t } = useI18n();

  const values = state.values ?? {
    full_name: initial?.full_name ?? '',
    phone: initial?.phone ?? '',
    email: initial?.email ?? '',
    address: initial?.address ?? '',
    postal_code: initial?.postal_code ?? '',
    city: initial?.city ?? '',
    note: initial?.note ?? '',
  };

  const [fullName, setFullName] = useState(values.full_name ?? '');
  const [postalCode, setPostalCode] = useState(values.postal_code ?? '');
  const [city, setCity] = useState(values.city ?? '');

  const handleCityDetected = useCallback((detectedCity: string) => {
    setCity((prev) => (prev.trim().length === 0 ? detectedCity : prev));
  }, []);

  const inputCls =
    'w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

  return (
    <form action={formAction} className="space-y-4">
      <CsrfTokenInput />
      <div>
        <label htmlFor="full_name" className="mb-1 block text-sm font-medium">
          {t.clientForm.fullName} <span className="text-red-500">*</span>
        </label>
        <input
          id="full_name"
          name="full_name"
          type="text"
          required
          value={fullName ?? ''}
          onChange={(e) => setFullName(e.target.value)}
          className={inputCls}
        />
        {state.errors?.full_name && <p className="mt-1 text-xs text-red-600">{state.errors.full_name}</p>}
      </div>

      <div>
        <label htmlFor="phone" className="mb-1 block text-sm font-medium">
          {t.clientForm.phone}
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          defaultValue={values.phone}
          placeholder="+49 ..."
          className={inputCls}
        />
        {state.errors?.phone && <p className="mt-1 text-xs text-red-600">{state.errors.phone}</p>}
      </div>

      <div>
        <label htmlFor="email" className="mb-1 block text-sm font-medium">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          defaultValue={values.email}
          placeholder="kunde@example.com"
          className={inputCls}
        />
        {state.errors?.email && <p className="mt-1 text-xs text-red-600">{state.errors.email}</p>}
        <p className="mt-1 text-xs text-neutral-500">{t.clientForm.emailHelp}</p>
      </div>

      <div>
        <label htmlFor="address" className="mb-1 block text-sm font-medium">
          {t.clientForm.address}
        </label>
        <input
          id="address"
          name="address"
          type="text"
          defaultValue={values.address}
          placeholder="Musterstrasse 15"
          className={inputCls}
        />
        {state.errors?.address && <p className="mt-1 text-xs text-red-600">{state.errors.address}</p>}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label htmlFor="postal_code" className="mb-1 block text-sm font-medium">
            PLZ
          </label>
          <input
            id="postal_code"
            name="postal_code"
            type="text"
            inputMode="numeric"
            maxLength={5}
            value={postalCode ?? ''}
            onChange={(e) => setPostalCode(e.target.value.replace(/\D/g, ''))}
            placeholder="20095"
            className={inputCls}
          />
          {state.errors?.postal_code && <p className="mt-1 text-xs text-red-600">{state.errors.postal_code}</p>}
        </div>

        <div className="col-span-2">
          <label htmlFor="city" className="mb-1 block text-sm font-medium">
            {t.clientForm.city}
          </label>
          <input
            id="city"
            name="city"
            type="text"
            value={city ?? ''}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Hamburg"
            className={inputCls}
          />
          {state.errors?.city && <p className="mt-1 text-xs text-red-600">{state.errors.city}</p>}
          <p className="mt-1 text-xs text-neutral-500">{t.clientForm.cityHelp}</p>
        </div>
      </div>

      <PostalCodeLookup postalCode={postalCode} onCityDetected={handleCityDetected} />

      <div>
        <label htmlFor="note" className="mb-1 block text-sm font-medium">
          {t.clientForm.note}
        </label>
        <textarea
          id="note"
          name="note"
          rows={3}
          defaultValue={values.note}
          className={`${inputCls} resize-y`}
        />
        {state.errors?.note && <p className="mt-1 text-xs text-red-600">{state.errors.note}</p>}
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
          {isPending ? t.clientForm.saving : submitLabel}
        </button>
        <Link
          href={cancelHref}
          className="rounded-lg border border-neutral-300 px-4 py-2.5 text-sm font-medium hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
        >
          {t.clientForm.cancel}
        </Link>
      </div>
    </form>
  );
}
