'use client';

import { useActionState } from 'react';
import type { SumupConnectionState } from '@/app/(dashboard)/settings/sumup/actions';
import CsrfTokenInput from '@/components/security/CsrfTokenInput';

type Props = {
  action: (prev: SumupConnectionState, fd: FormData) => Promise<SumupConnectionState>;
  locale: 'ru' | 'de';
};

export default function SumupConnectionForm({ action, locale }: Props) {
  const [state, formAction, isPending] = useActionState<SumupConnectionState, FormData>(action, {});

  const text =
    locale === 'de'
      ? {
          accessToken: 'Access Token',
          accessTokenHelp:
            'Merchant Code wird automatisch aus deinem SumUp Account erkannt. Der Token wird nur serverseitig verschluesselt gespeichert.',
          save: 'SumUp verbinden',
          saving: 'Speichern...',
          success: 'SumUp Verbindung wurde gespeichert.',
        }
      : {
          accessToken: 'Access Token',
          accessTokenHelp:
            'Merchant Code \u043e\u043f\u0440\u0435\u0434\u0435\u043b\u044f\u0435\u0442\u0441\u044f \u0430\u0432\u0442\u043e\u043c\u0430\u0442\u0438\u0447\u0435\u0441\u043a\u0438 \u0438\u0437 \u0430\u043a\u043a\u0430\u0443\u043d\u0442\u0430 SumUp. \u0422\u043e\u043a\u0435\u043d \u0445\u0440\u0430\u043d\u0438\u0442\u0441\u044f \u0442\u043e\u043b\u044c\u043a\u043e \u043d\u0430 \u0441\u0435\u0440\u0432\u0435\u0440\u0435 \u0432 \u0437\u0430\u0448\u0438\u0444\u0440\u043e\u0432\u0430\u043d\u043d\u043e\u043c \u0432\u0438\u0434\u0435.',
          save: '\u041f\u043e\u0434\u043a\u043b\u044e\u0447\u0438\u0442\u044c SumUp',
          saving: '\u0421\u043e\u0445\u0440\u0430\u043d\u0435\u043d\u0438\u0435...',
          success: '\u041f\u043e\u0434\u043a\u043b\u044e\u0447\u0435\u043d\u0438\u0435 SumUp \u0441\u043e\u0445\u0440\u0430\u043d\u0435\u043d\u043e.',
        };

  const values = state.values ?? {
    access_token: '',
  };

  return (
    <form action={formAction} className="space-y-4">
      <CsrfTokenInput />

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
          className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
