'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import type { ClientFormState } from '@/app/(dashboard)/clients/actions';

type Props = {
  action: (
    prevState: ClientFormState,
    formData: FormData
  ) => Promise<ClientFormState>;
  initial?: {
    full_name?: string | null;
    phone?: string | null;
    email?: string | null;           // ← новое
    address?: string | null;
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

  // При ошибке валидации используем отправленные значения, иначе — initial из БД
  const v = state.values ?? {
    full_name: initial?.full_name ?? '',
    phone: initial?.phone ?? '',
    email: initial?.email ?? '',           // ← новое
    address: initial?.address ?? '',
    note: initial?.note ?? '',
  };

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="full_name" className="block text-sm font-medium mb-1">
          Имя клиента <span className="text-red-500">*</span>
        </label>
        <input
          id="full_name"
          name="full_name"
          type="text"
          required
          defaultValue={v.full_name}
          className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {state.errors?.full_name && (
          <p className="text-xs text-red-600 mt-1">{state.errors.full_name}</p>
        )}
      </div>

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
          className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {state.errors?.phone && (
          <p className="text-xs text-red-600 mt-1">{state.errors.phone}</p>
        )}
      </div>
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
    className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
  />
  {state.errors?.email && (
    <p className="text-xs text-red-600 mt-1">{state.errors.email}</p>
  )}
  <p className="text-xs text-neutral-500 mt-1">
    Нужен для отправки счетов
  </p>
</div>

      <div>
        <label htmlFor="address" className="block text-sm font-medium mb-1">
          Адрес
        </label>
        <input
          id="address"
          name="address"
          type="text"
          defaultValue={v.address}
          className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {state.errors?.address && (
          <p className="text-xs text-red-600 mt-1">{state.errors.address}</p>
        )}
      </div>

      <div>
        <label htmlFor="note" className="block text-sm font-medium mb-1">
          Заметка
        </label>
        <textarea
          id="note"
          name="note"
          rows={3}
          defaultValue={v.note}
          className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
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