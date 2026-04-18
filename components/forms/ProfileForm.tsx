'use client';

import { useActionState } from 'react';
import { updateProfileAction, type ProfileFormState } from '@/app/(dashboard)/settings/actions';

type Props = {
  initial: {
    full_name: string | null;
    phone: string | null;
    company_name: string | null;
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
  };

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="full_name" className="block text-sm font-medium mb-1">
          Ваше имя
        </label>
        <input
          id="full_name"
          name="full_name"
          type="text"
          defaultValue={v.full_name}
          placeholder="Иван Петров"
          className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
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
          className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label htmlFor="company_name" className="block text-sm font-medium mb-1">
          Название компании
        </label>
        <input
          id="company_name"
          name="company_name"
          type="text"
          defaultValue={v.company_name}
          placeholder="MasterFlow Services"
          className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="text-xs text-neutral-500 mt-1">
          Будет отображаться в PDF-счетах
        </p>
      </div>

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