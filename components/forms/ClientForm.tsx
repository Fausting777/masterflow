'use client';

import { useActionState, useCallback, useState } from 'react';
import Link from 'next/link';
import type { ClientFormState } from '@/app/(dashboard)/clients/actions';
import MrzScanner from '@/components/clients/MrzScanner';
import PostalCodeLookup from '@/components/clients/PostalCodeLookup';

type Props = {
  action: (
    prevState: ClientFormState,
    formData: FormData
  ) => Promise<ClientFormState>;
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
  const [state, formAction, isPending] = useActionState<ClientFormState, FormData>(
    action,
    {}
  );

  const v = state.values ?? {
    full_name: initial?.full_name ?? '',
    phone: initial?.phone ?? '',
    email: initial?.email ?? '',
    address: initial?.address ?? '',
    postal_code: initial?.postal_code ?? '',
    city: initial?.city ?? '',
    note: initial?.note ?? '',
  };

  // Контролируемые значения — меняются при сканировании и автогороде
  const [fullName, setFullName] = useState(v.full_name);
  const [postalCode, setPostalCode] = useState(v.postal_code);
  const [city, setCity] = useState(v.city);

  // Обрабатываем результат сканирования
  const handleScanResult = useCallback(({ fullName }: { fullName: string }) => {
    setFullName(fullName);
  }, []);

  // Обрабатываем автоопределение города
  const handleCityDetected = useCallback((detectedCity: string) => {
    // Не перезатираем, если пользователь уже что-то ввёл отличное
    setCity((prev) => (prev.trim().length === 0 ? detectedCity : prev));
  }, []);

  const inputCls =
    'w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

  return (
    <form action={formAction} className="space-y-4">
      {/* Сканер MRZ */}
      <MrzScanner onResult={handleScanResult} />

      {/* Имя */}
      <div>
        <label htmlFor="full_name" className="block text-sm font-medium mb-1">
          Имя клиента <span className="text-red-500">*</span>
        </label>
        <input
          id="full_name"
          name="full_name"
          type="text"
          required
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className={inputCls}
        />
        {state.errors?.full_name && (
          <p className="text-xs text-red-600 mt-1">{state.errors.full_name}</p>
        )}
      </div>

      {/* Телефон */}
      <div>
        <label htmlFor="phone" className="block text-sm font-medium mb-1">
          Телефон
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          defaultValue={v.phone}
          placeholder="+49 ..."
          className={inputCls}
        />
        {state.errors?.phone && (
          <p className="text-xs text-red-600 mt-1">{state.errors.phone}</p>
        )}
      </div>

      {/* Email */}
      <div>
        <label htmlFor="email" className="block text-sm font-medium mb-1">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          defaultValue={v.email}
          placeholder="kunde@example.com"
          className={inputCls}
        />
        {state.errors?.email && (
          <p className="text-xs text-red-600 mt-1">{state.errors.email}</p>
        )}
        <p className="text-xs text-neutral-500 mt-1">Нужен для отправки счетов</p>
      </div>

      {/* Адрес — улица + дом */}
      <div>
        <label htmlFor="address" className="block text-sm font-medium mb-1">
          Улица и дом
        </label>
        <input
          id="address"
          name="address"
          type="text"
          defaultValue={v.address}
          placeholder="Musterstraße 15"
          className={inputCls}
        />
        {state.errors?.address && (
          <p className="text-xs text-red-600 mt-1">{state.errors.address}</p>
        )}
      </div>

      {/* PLZ + город */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label htmlFor="postal_code" className="block text-sm font-medium mb-1">
            PLZ
          </label>
          <input
            id="postal_code"
            name="postal_code"
            type="text"
            inputMode="numeric"
            maxLength={5}
            value={postalCode}
            onChange={(e) => setPostalCode(e.target.value.replace(/\D/g, ''))}
            placeholder="20095"
            className={inputCls}
          />
          {state.errors?.postal_code && (
            <p className="text-xs text-red-600 mt-1">{state.errors.postal_code}</p>
          )}
        </div>
        <div className="col-span-2">
          <label htmlFor="city" className="block text-sm font-medium mb-1">
            Город
          </label>
          <input
            id="city"
            name="city"
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Hamburg"
            className={inputCls}
          />
          {state.errors?.city && (
            <p className="text-xs text-red-600 mt-1">{state.errors.city}</p>
          )}
          <p className="text-xs text-neutral-500 mt-1">
            Подставится автоматически по PLZ
          </p>
        </div>
      </div>

      {/* Автоопределение города */}
      <PostalCodeLookup postalCode={postalCode} onCityDetected={handleCityDetected} />

      {/* Заметка */}
      <div>
        <label htmlFor="note" className="block text-sm font-medium mb-1">
          Заметка
        </label>
        <textarea
          id="note"
          name="note"
          rows={3}
          defaultValue={v.note}
          className={`${inputCls} resize-y`}
        />
        {state.errors?.note && (
          <p className="text-xs text-red-600 mt-1">{state.errors.note}</p>
        )}
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