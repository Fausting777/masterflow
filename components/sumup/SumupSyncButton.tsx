'use client';

import { useActionState } from 'react';
import type { SumupSyncState } from '@/app/(dashboard)/settings/sumup/actions';
import CsrfTokenInput from '@/components/security/CsrfTokenInput';

type Props = {
  action: (prev: SumupSyncState, fd: FormData) => Promise<SumupSyncState>;
  locale: 'ru' | 'de';
};

export default function SumupSyncButton({ action, locale }: Props) {
  const [state, formAction, isPending] = useActionState<SumupSyncState, FormData>(action, {});

  const text =
    locale === 'de'
      ? {
          sync: 'Transaktionen importieren',
          syncing: 'Import laeuft...',
          success: 'Import abgeschlossen',
          imported: 'Transaktionen verarbeitet',
        }
      : {
          sync: '\u0418\u043c\u043f\u043e\u0440\u0442\u0438\u0440\u043e\u0432\u0430\u0442\u044c \u0442\u0440\u0430\u043d\u0437\u0430\u043a\u0446\u0438\u0438',
          syncing: '\u0418\u043c\u043f\u043e\u0440\u0442...',
          success:
            '\u0418\u043c\u043f\u043e\u0440\u0442 \u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043d',
          imported:
            '\u0442\u0440\u0430\u043d\u0437\u0430\u043a\u0446\u0438\u0439 \u043e\u0431\u0440\u0430\u0431\u043e\u0442\u0430\u043d\u043e',
        };

  return (
    <form action={formAction} className="space-y-2">
      <CsrfTokenInput />
      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:bg-blue-400"
      >
        {isPending ? text.syncing : text.sync}
      </button>

      {state.success && (
        <p className="text-xs text-green-700">
          {text.success}: {state.imported ?? 0} {text.imported}
        </p>
      )}

      {state.formError && <p className="text-xs text-red-600">{state.formError}</p>}
    </form>
  );
}
