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
          back: 'Zurueck zu Einstellungen',
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
          importedPayments: 'Nicht verknuepfte SumUp Zahlungen',
          noPayments:
            'Noch keine nicht verknuepften SumUp Zahlungen. Importiere Transaktionen oder pruefe spaeter erneut.',
          transaction: 'Transaktion',
          receipt: 'Beleg',
          status: 'Status',
          paidAt: 'Bezahlt am',
          nextStepTitle: 'Naechster Schritt',
          nextStepText:
            'Als naechstes wird in jedem Auftrag eine Aktion hinzugefuegt, mit der diese Zahlungen per Betrag und Datum verknuepft werden koennen.',
        }
      : {
          back: 'Назад к настройкам',
          title: 'Интеграция SumUp',
          subtitle:
            'Подключи свой аккаунт SumUp, импортируй оплаты и потом привязывай их к заказам.',
          currentConnection: 'Текущее подключение',
          notConnected: 'SumUp еще не подключен.',
          merchantCode: 'Merchant Code',
          token: 'Токен',
          lastSync: 'Последняя синхронизация',
          never: 'Еще не было',
          disconnect: 'Удалить подключение',
          importedPayments: 'Непривязанные оплаты SumUp',
          noPayments:
            'Пока нет непривязанных оплат SumUp. Импортируй транзакции или проверь позже.',
          transaction: 'Транзакция',
          receipt: 'Чек',
          status: 'Статус',
          paidAt: 'Оплачено',
          nextStepTitle: 'Следующий шаг',
          nextStepText:
            'Дальше добавим в каждый заказ действие, чтобы эти оплаты можно было привязывать по сумме и дате.',
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
        <SumupConnectionForm
          action={saveSumupConnectionAction}
          initial={{ merchant_code: savedConnection?.merchant_code ?? null }}
          locale={locale}
        />
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
