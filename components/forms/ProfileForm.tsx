'use client';

import { useActionState } from 'react';
import { updateProfileAction, type ProfileFormState } from '@/app/(dashboard)/settings/actions';

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
    bank_name: string | null;
  };
};

export default function ProfileForm({ initial }: Props) {
  const [state, formAction, isPending] = useActionState<ProfileFormState, FormData>(
    updateProfileAction,
    {}
  );

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
    bank_name: initial.bank_name ?? '',
  };

  const inputCls =
    'w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

  return (
    <form action={formAction} className="space-y-6">
      {/* Личные данные */}
      <section className="space-y-4">
        <h3 className="text-sm font-semibold text-neutral-700 border-b border-neutral-200 pb-2">
          Личные данные
        </h3>

        <div>
          <label htmlFor="full_name" className="block text-sm font-medium mb-1">
            Ваше имя <span className="text-red-500">*</span>
          </label>
          <input id="full_name" name="full_name" type="text" defaultValue={v.full_name}
            placeholder="Иван Петров" className={inputCls} />
        </div>

        <div>
          <label htmlFor="phone" className="block text-sm font-medium mb-1">Телефон</label>
          <input id="phone" name="phone" type="tel" defaultValue={v.phone}
            placeholder="+49 176 ..." className={inputCls} />
        </div>

        <div>
          <label htmlFor="company_name" className="block text-sm font-medium mb-1">
            Название компании
          </label>
          <input id="company_name" name="company_name" type="text" defaultValue={v.company_name}
            placeholder="Petrov Handwerk" className={inputCls} />
        </div>
      </section>
      

      {/* Адрес */}
      <section className="space-y-4">
        <h3 className="text-sm font-semibold text-neutral-700 border-b border-neutral-200 pb-2">
          Адрес <span className="text-red-500">*</span>
          <span className="text-xs font-normal text-neutral-500 ml-2">
            (обязательно для счетов)
          </span>
        </h3>
        <div>
  <label htmlFor="business_email" className="block text-sm font-medium mb-1">
    Корпоративная почта
  </label>
  <input
    id="business_email"
    name="business_email"
    type="email"
    defaultValue={v.business_email ?? ''}
    placeholder="info@ihre-firma.de"
    className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
  />
  <p className="text-xs text-neutral-500 mt-1">
    Этот email будет отображаться на PDF-счетах и использоваться как адрес для ответов клиентов.
    Если не указан — используется email входа.
  </p>
  {state.errors?.business_email && (
    <p className="text-xs text-red-600 mt-1">{state.errors.business_email}</p>
  )}
</div>

        <div>
          <label htmlFor="address" className="block text-sm font-medium mb-1">Улица и дом</label>
          <input id="address" name="address" type="text" defaultValue={v.address}
            placeholder="Musterstraße 15" className={inputCls} />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label htmlFor="postal_code" className="block text-sm font-medium mb-1">PLZ</label>
            <input id="postal_code" name="postal_code" type="text" defaultValue={v.postal_code}
              placeholder="20095" className={inputCls} />
          </div>
          <div className="col-span-2">
            <label htmlFor="city" className="block text-sm font-medium mb-1">Город</label>
            <input id="city" name="city" type="text" defaultValue={v.city}
              placeholder="Hamburg" className={inputCls} />
          </div>
        </div>
      </section>

      {/* Налоговые данные */}
      <section className="space-y-4">
        <h3 className="text-sm font-semibold text-neutral-700 border-b border-neutral-200 pb-2">
          Налоговые данные
        </h3>

       <label className="flex items-start gap-3 cursor-pointer rounded-lg border border-neutral-200 p-3 hover:bg-neutral-50 transition">
  <input
    type="checkbox"
    name="is_kleinunternehmer"
    defaultChecked={v.is_kleinunternehmer}
    className="mt-0.5 w-5 h-5 flex-shrink-0 accent-blue-600 cursor-pointer"
    style={{
      accentColor: '#2563eb',
    }}
  />
  <div className="flex-1">
    <div className="text-sm font-medium">Kleinunternehmer (§19 UStG)</div>
    <div className="text-xs text-neutral-500 mt-0.5">
      НДС не выставляется. В счетах автоматически добавится соответствующая пометка.
    </div>
  </div>
</label>

        <div>
          <label htmlFor="tax_number" className="block text-sm font-medium mb-1">
            Steuernummer <span className="text-red-500">*</span>
          </label>
          <input id="tax_number" name="tax_number" type="text" defaultValue={v.tax_number}
            placeholder="12/345/67890" className={inputCls} />
          <p className="text-xs text-neutral-500 mt-1">
            Выдаёт Finanzamt. Обязательно для счёта.
          </p>
        </div>

        <div>
          <label htmlFor="vat_id" className="block text-sm font-medium mb-1">
            USt-IdNr.
            <span className="text-xs font-normal text-neutral-500 ml-2">(опционально)</span>
          </label>
          <input id="vat_id" name="vat_id" type="text" defaultValue={v.vat_id}
            placeholder="DE123456789" className={inputCls} />
          <p className="text-xs text-neutral-500 mt-1">
            Если есть. Kleinunternehmer обычно не имеют.
          </p>
        </div>
      </section>

      {/* Банковские реквизиты */}
      <section className="space-y-4">
        <h3 className="text-sm font-semibold text-neutral-700 border-b border-neutral-200 pb-2">
          Банковские реквизиты
          <span className="text-xs font-normal text-neutral-500 ml-2">(будут в счёте)</span>
        </h3>

        <div>
          <label htmlFor="iban" className="block text-sm font-medium mb-1">IBAN</label>
          <input id="iban" name="iban" type="text" defaultValue={v.iban}
            placeholder="DE89 3704 0044 0532 0130 00" className={inputCls} />
        </div>

        <div>
          <label htmlFor="bank_name" className="block text-sm font-medium mb-1">Банк</label>
          <input id="bank_name" name="bank_name" type="text" defaultValue={v.bank_name}
            placeholder="Commerzbank" className={inputCls} />
        </div>
      </section>

      {state.formError && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
          {state.formError}
        </div>
      )}

      {state.success && (
        <div className="rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-700">
          ✓ Сохранено
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2.5 text-sm transition"
      >
        {isPending ? 'Сохранение...' : 'Сохранить'}
      </button>
    </form>
  );
}