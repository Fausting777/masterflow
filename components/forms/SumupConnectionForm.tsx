'use client';

import { useActionState } from 'react';
import type { SumupConnectionState } from '@/app/(dashboard)/settings/sumup/actions';
import CsrfTokenInput from '@/components/security/CsrfTokenInput';

type Props = {
  action: (prev: SumupConnectionState, fd: FormData) => Promise<SumupConnectionState>;
  initial?: {
    merchant_code?: string | null;
  };
  locale: 'ru' | 'de';
};

export default function SumupConnectionForm({ action, initial, locale }: Props) {
  const [state, formAction, isPending] = useActionState<SumupConnectionState, FormData>(action, {});

  const text =
    locale === 'de'
      ? {
          merchantCode: 'Merchant Code',
          accessToken: 'Access Token',
          accessTokenHelp:
            'Der Token wird nur serverseitig verschluesselt gespeichert und nicht im Browser abgelegt.',
          save: 'SumUp verbinden',
          saving: 'Speichern...',
          success: 'SumUp Verbindung wurde gespeichert.',
        }
      : {
          merchantCode: 'Merchant Code',
          accessToken: 'Access Token',
          accessTokenHelp:
            'Токен сохраняется только на сервере в зашифрованном виде и не хранится в браузере.',
          save: 'Подключить SumUp',
          saving: 'Сохранение...',
          success: 'Подключение SumUp сохранено.',
        };

  const values = state.values ?? {
    merchant_code: initial?.merchant_code ?? '',
    access_token: '',
  };

  const inputClass =
    'w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

  return (
    <form action={formAction} className="space-y-4">
      <CsrfTokenInput />

      <div>
        <label htmlFor="merchant_code" className="mb-1 block text-sm font-medium">
          {text.merchantCode}
        </label>
        <input
          id="merchant_code"
          name="merchant_code"
          type="text"
          required
          defaultValue={values.merchant_code}
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="access_token" className="mb-1 block text-sm font-medium">
          {text.accessToken}
        </label>
        <input
          id="access_token"
          name="access_token"
          type="password"
          required
          defaultValue={values.access_token}
          className={inputClass}
          autoComplete="off"
        />
        <p className="mt-1 text-xs text-neutral-500">{text.accessTokenHelp}</p>
      </div>

      {state.formError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.formError}
        </div>
      )}

      {state.success && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
          {text.success}
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:bg-blue-400"
      >
        {isPending ? text.saving : text.save}
      </button>
    </form>
  );
}
