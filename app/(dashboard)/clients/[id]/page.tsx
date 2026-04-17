import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import ClientForm from '@/components/forms/ClientForm';
import DeleteClientButton from '@/components/forms/DeleteClientButton';
import { updateClientAction } from '../actions';
import type { Client } from '@/types/database';

type Params = Promise<{ id: string }>;
type SearchParams = Promise<{ edit?: string }>;

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

  const supabase = await createClient();
  const { data: client, error } = await supabase
    .from('clients')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error || !client) {
    notFound();
  }

  const c = client as Client;

  // Привязываем id к action
  const boundUpdate = updateClientAction.bind(null, c.id);

  return (
    <div className="max-w-lg">
      <div className="mb-4">
        <Link
          href="/clients"
          className="text-sm text-neutral-500 hover:text-neutral-700"
        >
          ← Назад к списку
        </Link>
      </div>

      {isEditing ? (
        <>
          <h1 className="text-2xl font-semibold mb-4">Редактировать клиента</h1>
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5">
            <ClientForm
              action={boundUpdate}
              initial={c}
              cancelHref={`/clients/${c.id}`}
              submitLabel="Сохранить"
            />
          </div>
        </>
      ) : (
        <>
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-semibold truncate">{c.full_name}</h1>
            <Link
              href={`/clients/${c.id}?edit=1`}
              className="rounded-lg border border-neutral-300 dark:border-neutral-700 text-sm font-medium px-4 py-2 hover:bg-neutral-50 dark:hover:bg-neutral-800"
            >
              Редактировать
            </Link>
          </div>

          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 space-y-3 mb-4">
            <InfoRow label="Телефон" value={c.phone} />
            <InfoRow label="Адрес" value={c.address} />
            <InfoRow label="Заметка" value={c.note} multiline />
            <InfoRow
              label="Создан"
              value={new Date(c.created_at).toLocaleDateString('ru-RU')}
            />
          </div>

          <DeleteClientButton clientId={c.id} />
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
        className={`text-sm font-medium ${
          multiline ? 'mt-1 whitespace-pre-wrap' : 'text-right'
        } ${!value ? 'text-neutral-400 italic font-normal' : ''}`}
      >
        {value || '—'}
      </dd>
    </div>
  );
}