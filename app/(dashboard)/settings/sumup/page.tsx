import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getLocale } from '@/lib/i18n/server';
import SumupConnectionForm from '@/components/forms/SumupConnectionForm';
import SumupSyncButton from '@/components/sumup/SumupSyncButton';
import {
  deleteSumupConnectionAction,
  saveSumupConnectionAction,
  syncSumupTransactionsAction,
} from './actions';
import type { SumupConnection, SumupTransaction } from '@/types/database';
import CsrfTokenInput from '@/components/security/CsrfTokenInput';
import { formatPrice } from '@/lib/utils/format';

export default async function SumupSettingsPage() {
  const locale = await getLocale();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: connection }, { data: transactions }] = user
    ? await Promise.all([
        supabase
          .from('sumup_connections')
          .select('id, merchant_code, access_token_hint, last_synced_at, created_at, updated_at')
          .eq('user_id', user.id)
          .maybeSingle(),
        supabase
          .from('sumup_transactions')
          .select('*')
          .eq('user_id', user.id)
          .is('order_id', null)
          .order('paid_at', { ascending: false, nullsFirst: false })
          .limit(20),
      ])
    : [{ data: null }, { data: [] }];

  const savedConnection = connection as Pick<
    SumupConnection,
    'id' | 'merchant_code' | 'access_token_hint' | 'last_synced_at' | 'created_at' | 'updated_at'
  > | null;
  const unlinkedTransactions = (transactions ?? []) as SumupTransaction[];

  const text =
    locale === 'de'
      ? {
          back: 'Zurück zu Einstellungen',
          title: 'SumUp Integration',
          subtitle:
            'Verbinde deinen SumUp Account, importiere Zahlungen und verknuepfe sie danach mit Auftraegen.',
          currentConnection: 'Aktuelle Verbindung',
          notConnected: 'SumUp ist noch nicht verbunden.',
          merchantCode: 'Merchant Code',
          token: 'Token',
          lastSync: 'Letzte Synchronisation',
          never: 'Noch nie',
          disconnect: 'Verbindung entfernen',
          importedPayments: 'Nicht verknüpfte SumUp Zahlungen',
          noPayments:
            'Noch keine nicht verknüpften SumUp Zahlungen. Importiere Transaktionen oder pruefe später erneut.',
          transaction: 'Transaktion',
          receipt: 'Beleg',
          status: 'Status',
          paidAt: 'Bezahlt am',
          nextStepTitle: 'So funktioniert es',
          nextStepText:
            'Gib nur den SumUp Access Token ein. Merchant Code wird automatisch erkannt und danach für den Import der Transaktionen verwendet.',
        }
      : {
          back: '\u041d\u0430\u0437\u0430\u0434 \u043a \u043d\u0430\u0441\u0442\u0440\u043e\u0439\u043a\u0430\u043c',
          title: '\u0418\u043d\u0442\u0435\u0433\u0440\u0430\u0446\u0438\u044f SumUp',
          subtitle:
            '\u041f\u043e\u0434\u043a\u043b\u044e\u0447\u0438 \u0441\u0432\u043e\u0439 \u0430\u043a\u043a\u0430\u0443\u043d\u0442 SumUp, \u0438\u043c\u043f\u043e\u0440\u0442\u0438\u0440\u0443\u0439 \u043e\u043f\u043b\u0430\u0442\u044b \u0438 \u043f\u043e\u0442\u043e\u043c \u043f\u0440\u0438\u0432\u044f\u0437\u044b\u0432\u0430\u0439 \u0438\u0445 \u043a \u0437\u0430\u043a\u0430\u0437\u0430\u043c.',
          currentConnection: '\u0422\u0435\u043a\u0443\u0449\u0435\u0435 \u043f\u043e\u0434\u043a\u043b\u044e\u0447\u0435\u043d\u0438\u0435',
          notConnected: 'SumUp \u0435\u0449\u0435 \u043d\u0435 \u043f\u043e\u0434\u043a\u043b\u044e\u0447\u0435\u043d.',
          merchantCode: 'Merchant Code',
          token: '\u0422\u043e\u043a\u0435\u043d',
          lastSync:
            '\u041f\u043e\u0441\u043b\u0435\u0434\u043d\u044f\u044f \u0441\u0438\u043d\u0445\u0440\u043e\u043d\u0438\u0437\u0430\u0446\u0438\u044f',
          never: '\u0415\u0449\u0435 \u043d\u0435 \u0431\u044b\u043b\u043e',
          disconnect:
            '\u0423\u0434\u0430\u043b\u0438\u0442\u044c \u043f\u043e\u0434\u043a\u043b\u044e\u0447\u0435\u043d\u0438\u0435',
          importedPayments:
            '\u041d\u0435\u043f\u0440\u0438\u0432\u044f\u0437\u0430\u043d\u043d\u044b\u0435 \u043e\u043f\u043b\u0430\u0442\u044b SumUp',
          noPayments:
            '\u041f\u043e\u043a\u0430 \u043d\u0435\u0442 \u043d\u0435\u043f\u0440\u0438\u0432\u044f\u0437\u0430\u043d\u043d\u044b\u0445 \u043e\u043f\u043b\u0430\u0442 SumUp. \u0418\u043c\u043f\u043e\u0440\u0442\u0438\u0440\u0443\u0439 \u0442\u0440\u0430\u043d\u0437\u0430\u043a\u0446\u0438\u0438 \u0438\u043b\u0438 \u043f\u0440\u043e\u0432\u0435\u0440\u044c \u043f\u043e\u0437\u0436\u0435.',
          transaction: '\u0422\u0440\u0430\u043d\u0437\u0430\u043a\u0446\u0438\u044f',
          receipt: '\u0427\u0435\u043a',
          status: '\u0421\u0442\u0430\u0442\u0443\u0441',
          paidAt: '\u041e\u043f\u043b\u0430\u0447\u0435\u043d\u043e',
          nextStepTitle: '\u041a\u0430\u043a \u044d\u0442\u043e \u0440\u0430\u0431\u043e\u0442\u0430\u0435\u0442',
          nextStepText:
            '\u0412\u0432\u043e\u0434\u0438\u0442\u0441\u044f \u0442\u043e\u043b\u044c\u043a\u043e SumUp Access Token. Merchant Code \u043e\u043f\u0440\u0435\u0434\u0435\u043b\u044f\u0435\u0442\u0441\u044f \u0430\u0432\u0442\u043e\u043c\u0430\u0442\u0438\u0447\u0435\u0441\u043a\u0438 \u0438 \u0434\u0430\u043b\u044c\u0448\u0435 \u0438\u0441\u043f\u043e\u043b\u044c\u0437\u0443\u0435\u0442\u0441\u044f \u0434\u043b\u044f \u0438\u043c\u043f\u043e\u0440\u0442\u0430 \u0442\u0440\u0430\u043d\u0437\u0430\u043a\u0446\u0438\u0439.',
        };

  const formatDateTime = (value: string | null) =>
    value
      ? new Date(value).toLocaleString(locale === 'de' ? 'de-DE' : 'ru-RU', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : text.never;

  return (
    <div className="max-w-2xl">
      <Link href="/settings" className="text-sm text-neutral-500 hover:text-neutral-700">
        {'<-'} {text.back}
      </Link>

      <h1 className="mt-4 text-2xl font-semibold">{text.title}</h1>
      <p className="mt-1 text-sm text-neutral-500">{text.subtitle}</p>

      <div className="mt-6 rounded-xl border border-neutral-200 bg-white p-5">
        <h2 className="text-base font-semibold">{text.currentConnection}</h2>
        {savedConnection ? (
          <div className="mt-3 space-y-2 text-sm">
            <InfoRow label={text.merchantCode} value={savedConnection.merchant_code} />
            <InfoRow label={text.token} value={savedConnection.access_token_hint ?? '****'} />
            <InfoRow label={text.lastSync} value={formatDateTime(savedConnection.last_synced_at)} />

            <div className="grid gap-2 pt-2 sm:grid-cols-2">
              <SumupSyncButton action={syncSumupTransactionsAction} locale={locale} />
              <form action={deleteSumupConnectionAction}>
                <CsrfTokenInput />
                <button
                  type="submit"
                  className="w-full rounded-lg border border-red-300 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50"
                >
                  {text.disconnect}
                </button>
              </form>
            </div>
          </div>
        ) : (
          <p className="mt-2 text-sm text-neutral-500">{text.notConnected}</p>
        )}
      </div>

      <div className="mt-6 rounded-xl border border-neutral-200 bg-white p-5">
        <SumupConnectionForm action={saveSumupConnectionAction} locale={locale} />
      </div>

      <div className="mt-6 rounded-xl border border-neutral-200 bg-white p-5">
        <h2 className="text-base font-semibold">{text.importedPayments}</h2>
        {unlinkedTransactions.length === 0 ? (
          <p className="mt-2 text-sm text-neutral-500">{text.noPayments}</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {unlinkedTransactions.map((transaction) => (
              <li key={transaction.id} className="rounded-lg border border-neutral-200 p-3 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium">
                      {transaction.transaction_code ?? transaction.sumup_transaction_id ?? text.transaction}
                    </div>
                    <div className="mt-1 text-xs text-neutral-500">
                      {text.paidAt}: {formatDateTime(transaction.paid_at)}
                    </div>
                    <div className="mt-1 text-xs text-neutral-500">
                      {text.status}: {transaction.status ?? '-'}
                    </div>
                    {transaction.receipt_no && (
                      <div className="mt-1 text-xs text-neutral-500">
                        {text.receipt}: {transaction.receipt_no}
                      </div>
                    )}
                  </div>
                  <div className="whitespace-nowrap text-right font-semibold">
                    {formatPrice(Number(transaction.amount))}
                    <div className="text-xs font-normal text-neutral-500">{transaction.currency}</div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-6 rounded-xl border border-blue-200 bg-blue-50 p-4">
        <h2 className="text-sm font-semibold text-blue-900">{text.nextStepTitle}</h2>
        <p className="mt-1 text-sm text-blue-800">{text.nextStepText}</p>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-neutral-500">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}
