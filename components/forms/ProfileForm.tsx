'use client';

import { useActionState } from 'react';
import { updateProfileAction, type ProfileFormState } from '@/app/(dashboard)/settings/actions';
import { useI18n } from '@/components/i18n/LocaleProvider';
import CsrfTokenInput from '@/components/security/CsrfTokenInput';
import Spinner from '@/components/ui/Spinner';

type Props = {
  initial: {
    full_name: string | null;
    phone: string | null;
    company_name: string | null;
    address: string | null;
    postal_code: string | null;
    city: string | null;
    tax_number: string | null;
    vat_id: string | null;
    is_kleinunternehmer: boolean;
    iban: string | null;
    bic: string | null;
    bank_name: string | null;
    business_email: string | null;
  };
};

export default function ProfileForm({ initial }: Props) {
  const [state, formAction, isPending] = useActionState<ProfileFormState, FormData>(
    updateProfileAction,
    {}
  );
  const { t } = useI18n();

  const v = state.values ?? {
    full_name: initial.full_name ?? '',
    phone: initial.phone ?? '',
    company_name: initial.company_name ?? '',
    address: initial.address ?? '',
    postal_code: initial.postal_code ?? '',
    city: initial.city ?? '',
    tax_number: initial.tax_number ?? '',
    vat_id: initial.vat_id ?? '',
    is_kleinunternehmer: initial.is_kleinunternehmer,
    iban: initial.iban ?? '',
    bic: initial.bic ?? '',
    bank_name: initial.bank_name ?? '',
    business_email: initial.business_email ?? '',
  };

  const inputCls =
    'w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100';

  return (
    <form action={formAction} className="space-y-6">
      <CsrfTokenInput />
      <section className="space-y-4">
        <h3 className="border-b border-neutral-200 pb-2 text-sm font-semibold text-neutral-700 dark:border-neutral-800 dark:text-neutral-300">
          {t.profileForm.personalTitle}
        </h3>

        <div>
          <label htmlFor="full_name" className="mb-1 block text-sm font-medium">
            {t.profileForm.fullName} <span className="text-red-500">*</span>
          </label>
          <input
            id="full_name"
            name="full_name"
            type="text"
            required
            defaultValue={v.full_name}
            placeholder={t.profileForm.fullNamePlaceholder}
            className={inputCls}
          />
        </div>

        <div>
          <label htmlFor="phone" className="mb-1 block text-sm font-medium">
            {t.profileForm.phone}
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            defaultValue={v.phone}
            placeholder="+49 176 ..."
            className={inputCls}
          />
        </div>

        <div>
          <label htmlFor="company_name" className="mb-1 block text-sm font-medium">
            {t.profileForm.companyName}
          </label>
          <input
            id="company_name"
            name="company_name"
            type="text"
            defaultValue={v.company_name}
            placeholder="Petrov Handwerk"
            className={inputCls}
          />
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="border-b border-neutral-200 pb-2 text-sm font-semibold text-neutral-700 dark:border-neutral-800 dark:text-neutral-300">
          {t.profileForm.addressTitle} <span className="text-red-500">*</span>
          <span className="ml-2 text-xs font-normal text-neutral-500">
            {t.profileForm.addressRequiredHint}
          </span>
        </h3>

        <div>
          <label htmlFor="business_email" className="mb-1 block text-sm font-medium">
            {t.profileForm.businessEmail}
          </label>
          <input
            id="business_email"
            name="business_email"
            type="email"
            defaultValue={v.business_email}
            placeholder="info@ihre-firma.de"
            className={inputCls}
          />
          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{t.profileForm.businessEmailHelp}</p>
        </div>

        <div>
          <label htmlFor="address" className="mb-1 block text-sm font-medium">
            {t.profileForm.address} <span className="text-red-500">*</span>
          </label>
          <input
            id="address"
            name="address"
            type="text"
            required
            defaultValue={v.address}
            placeholder="Musterstrasse 15"
            className={inputCls}
          />
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
              required
              defaultValue={v.postal_code}
              placeholder="20095"
              className={inputCls}
            />
          </div>
          <div className="col-span-2">
            <label htmlFor="city" className="mb-1 block text-sm font-medium">
              {t.profileForm.city} <span className="text-red-500">*</span>
            </label>
            <input
              id="city"
              name="city"
              type="text"
              required
              defaultValue={v.city}
              placeholder="Hamburg"
              className={inputCls}
            />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="border-b border-neutral-200 pb-2 text-sm font-semibold text-neutral-700 dark:border-neutral-800 dark:text-neutral-300">
          {t.profileForm.taxTitle}
        </h3>

        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-neutral-200 p-3 transition hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800">
          <input
            type="checkbox"
            name="is_kleinunternehmer"
            defaultChecked={v.is_kleinunternehmer}
            className="mt-0.5 h-5 w-5 flex-shrink-0 cursor-pointer accent-blue-600"
            style={{ accentColor: '#2563eb' }}
          />
          <div className="flex-1">
            <div className="text-sm font-medium">Kleinunternehmer (§ 19 UStG)</div>
            <div className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">{t.profileForm.kleinunternehmerHint}</div>
          </div>
        </label>

        <div>
          <label htmlFor="tax_number" className="mb-1 block text-sm font-medium">
            Steuernummer / USt-IdNr. <span className="text-red-500">*</span>
          </label>
          <input
            id="tax_number"
            name="tax_number"
            type="text"
            defaultValue={v.tax_number}
            placeholder="12/345/67890"
            className={inputCls}
          />
          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{t.profileForm.taxNumberHelp}</p>
        </div>

        <div>
          <label htmlFor="vat_id" className="mb-1 block text-sm font-medium">
            USt-IdNr.
            <span className="ml-2 text-xs font-normal text-neutral-500 dark:text-neutral-400">{t.profileForm.optionalHint}</span>
          </label>
          <input
            id="vat_id"
            name="vat_id"
            type="text"
            defaultValue={v.vat_id}
            placeholder="DE123456789"
            className={inputCls}
          />
          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{t.profileForm.vatIdHelp}</p>
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="border-b border-neutral-200 pb-2 text-sm font-semibold text-neutral-700 dark:border-neutral-800 dark:text-neutral-300">
          {t.profileForm.bankTitle}
          <span className="ml-2 text-xs font-normal text-neutral-500">{t.profileForm.bankTitleHint}</span>
        </h3>

        <div>
          <label htmlFor="iban" className="mb-1 block text-sm font-medium">
            IBAN
          </label>
          <input
            id="iban"
            name="iban"
            type="text"
            defaultValue={v.iban}
            placeholder="DE89 3704 0044 0532 0130 00"
            className={inputCls}
          />
        </div>

        <div>
          <label htmlFor="bic" className="mb-1 block text-sm font-medium">
            BIC
          </label>
          <input
            id="bic"
            name="bic"
            type="text"
            defaultValue={v.bic}
            placeholder="COBADEFFXXX"
            className={inputCls}
          />
        </div>

        <div>
          <label htmlFor="bank_name" className="mb-1 block text-sm font-medium">
            {t.profileForm.bankName}
          </label>
          <input
            id="bank_name"
            name="bank_name"
            type="text"
            defaultValue={v.bank_name}
            placeholder="Commerzbank"
            className={inputCls}
          />
        </div>
      </section>

      {state.formError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
          {state.formError}
        </div>
      )}

      {state.success && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700 dark:border-green-900 dark:bg-green-950/30 dark:text-green-400">
          {t.profileForm.success}
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:bg-blue-400"
      >
        {isPending ? (
          <span className="flex items-center justify-center gap-2">
            <Spinner size={15} />
            {t.profileForm.saving}
          </span>
        ) : t.profileForm.save}
      </button>
    </form>
  );
}
