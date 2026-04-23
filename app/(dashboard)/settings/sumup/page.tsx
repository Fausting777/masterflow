import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getLocale } from '@/lib/i18n/server';
import SumupConnectionForm from '@/components/forms/SumupConnectionForm';
import { deleteSumupConnectionAction, saveSumupConnectionAction } from './actions';
import type { SumupConnection } from '@/types/database';
import CsrfTokenInput from '@/components/security/CsrfTokenInput';

export default async function SumupSettingsPage() {
  const locale = await getLocale();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: connection } = user
    ? await supabase
        .from('sumup_connections')
        .select('id, merchant_code, access_token_hint, last_synced_at, created_at, updated_at')
        .eq('user_id', user.id)
        .maybeSingle()
    : { data: null };

  const savedConnection = connection as Pick<
    SumupConnection,
    'id' | 'merchant_code' | 'access_token_hint' | 'last_synced_at' | 'created_at' | 'updated_at'
  > | null;

  const text =
    locale === 'de'
      ? {
          back: 'Zurueck zu Einstellungen',
          title: 'SumUp Integration',
          subtitle:
            'Verbinde deinen SumUp Account, damit Zahlungen spaeter importiert und mit Auftraegen verknuepft werden koennen.',
          currentConnection: 'Aktuelle Verbindung',
          notConnected: 'SumUp ist noch nicht verbunden.',
          merchantCode: 'Merchant Code',
          token: 'Token',
          lastSync: 'Letzte Synchronisation',
          never: 'Noch nie',
          disconnect: 'Verbindung entfernen',
          nextStepTitle: 'Naechster Schritt',
          nextStepText:
            'Nach dem Speichern der Verbindung kann der Import der SumUp Transaktionen und die Verknuepfung mit Auftraegen aktiviert werden.',
        }
      : {
          back: 'Назад к настройкам',
          title: 'Интеграция SumUp',
          subtitle:
            'Подключи свой аккаунт SumUp, чтобы позже импортировать оплаты и привязывать их к заказам.',
          currentConnection: 'Текущее подключение',
          notConnected: 'SumUp еще не подключен.',
          merchantCode: 'Merchant Code',
          token: 'Токен',
          lastSync: 'Последняя синхронизация',
          never: 'Еще не было',
          disconnect: 'Удалить подключение',
          nextStepTitle: 'Следующий шаг',
          nextStepText:
            'После сохранения подключения можно включить импорт транзакций SumUp и привязку оплат к заказам.',
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
    <div className="max-w-xl">
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

            <form action={deleteSumupConnectionAction} className="pt-2">
              <CsrfTokenInput />
              <button
                type="submit"
                className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
              >
                {text.disconnect}
              </button>
            </form>
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
