import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getLocale } from '@/lib/i18n/server';
import ClientForm from '@/components/forms/ClientForm';
import DeleteClientButton from '@/components/forms/DeleteClientButton';
import DsgvoExportButton from '@/components/clients/DsgvoExportButton';
import { updateClientAction } from '../actions';
import type { Client } from '@/types/database';

type Params = Promise<{ id: string }>;
type SearchParams = Promise<{ edit?: string }>;

const DASH = '—';

export default async function ClientPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { id } = await params;
  const { edit } = await searchParams;
  const isEditing = edit === '1';
  const locale = await getLocale();

  const text =
    locale === 'de'
      ? {
          back: 'Zurück zur Liste',
          editTitle: 'Kunden bearbeiten',
          save: 'Speichern',
          edit: 'Bearbeiten',
          phone: 'Telefon',
          address: 'Adresse',
          city: 'Ort',
          note: 'Notiz',
          createdAt: 'Erstellt',
        }
      : {
          back: '\u041d\u0430\u0437\u0430\u0434 \u043a \u0441\u043f\u0438\u0441\u043a\u0443',
          editTitle: '\u0420\u0435\u0434\u0430\u043a\u0442\u0438\u0440\u043e\u0432\u0430\u0442\u044c \u043a\u043b\u0438\u0435\u043d\u0442\u0430',
          save: '\u0421\u043e\u0445\u0440\u0430\u043d\u0438\u0442\u044c',
          edit: '\u0420\u0435\u0434\u0430\u043a\u0442\u0438\u0440\u043e\u0432\u0430\u0442\u044c',
          phone: '\u0422\u0435\u043b\u0435\u0444\u043e\u043d',
          address: '\u0410\u0434\u0440\u0435\u0441',
          city: '\u0413\u043e\u0440\u043e\u0434',
          note: '\u0417\u0430\u043c\u0435\u0442\u043a\u0430',
          createdAt: '\u0421\u043e\u0437\u0434\u0430\u043d',
        };

  const supabase = await createClient();
  const { data: client, error } = await supabase.from('clients').select('*').eq('id', id).maybeSingle();

  if (error || !client) notFound();

  const c = client as Client;
  const boundUpdate = updateClientAction.bind(null, c.id);

  return (
    <div className="max-w-lg">
      <div className="mb-4">
        <Link href="/clients" className="text-sm text-neutral-500 hover:text-neutral-700">
          ← {text.back}
        </Link>
      </div>

      {isEditing ? (
        <>
          <h1 className="mb-4 text-2xl font-semibold">{text.editTitle}</h1>
          <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
            <ClientForm
              action={boundUpdate}
              initial={c}
              cancelHref={`/clients/${c.id}`}
              submitLabel={text.save}
            />
          </div>
        </>
      ) : (
        <>
          <div className="mb-4 flex items-center justify-between">
            <h1 className="truncate text-2xl font-semibold">{c.full_name}</h1>
            <Link
              href={`/clients/${c.id}?edit=1`}
              className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
            >
              {text.edit}
            </Link>
          </div>

          <div className="mb-4 space-y-3 rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
            <InfoRow label={text.phone} value={c.phone} />
            <InfoRow label="Email" value={c.email} />
            <InfoRow label={text.address} value={c.address} />
            <InfoRow
              label={text.city}
              value={c.postal_code && c.city ? `${c.postal_code} ${c.city}` : c.city ?? c.postal_code ?? null}
            />
            <InfoRow label={text.note} value={c.note} multiline />
            <InfoRow
              label={text.createdAt}
              value={new Date(c.created_at).toLocaleDateString(locale === 'de' ? 'de-DE' : 'ru-RU')}
            />
          </div>

          <div className="mt-4 rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
            <h2 className="mb-3 text-sm font-medium text-neutral-500">DSGVO</h2>
            <DsgvoExportButton clientId={c.id} />
          </div>

          <div className="mt-4">
            <DeleteClientButton clientId={c.id} />
          </div>
        </>
      )}
    </div>
  );
}

function InfoRow({
  label,
  value,
  multiline = false,
}: {
  label: string;
  value: string | null;
  multiline?: boolean;
}) {
  return (
    <div className={multiline ? '' : 'flex justify-between gap-4'}>
      <dt className="text-sm text-neutral-500">{label}</dt>
      <dd
        className={`text-sm font-medium ${multiline ? 'mt-1 whitespace-pre-wrap' : 'text-right'} ${
          !value ? 'font-normal italic text-neutral-400' : ''
        }`}
      >
        {value || DASH}
      </dd>
    </div>
  );
}
