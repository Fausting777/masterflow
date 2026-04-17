import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import type { Client } from '@/types/database';

type SearchParams = Promise<{ q?: string }>;

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { q } = await searchParams;
  const search = (q ?? '').trim();

  const supabase = await createClient();

  let query = supabase
    .from('clients')
    .select('*')
    .order('created_at', { ascending: false });

  if (search.length > 0) {
    // Поиск по имени ИЛИ телефону. RLS автоматически режет чужие записи.
    query = query.or(
      `full_name.ilike.%${search}%,phone.ilike.%${search}%`
    );
  }

  const { data: clients, error } = await query;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Клиенты</h1>
        <Link
          href="/clients/new"
          className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2"
        >
          + Новый
        </Link>
      </div>

      <form action="/clients" className="mb-4">
        <input
          type="text"
          name="q"
          defaultValue={search}
          placeholder="Поиск по имени или телефону..."
          className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </form>

      {error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 p-3 text-sm text-red-700 dark:text-red-300 mb-4">
          Ошибка загрузки: {error.message}
        </div>
      )}

      {clients && clients.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-300 dark:border-neutral-700 p-8 text-center text-sm text-neutral-500">
          {search ? (
            <>Ничего не найдено по запросу «{search}»</>
          ) : (
            <>
              Пока нет клиентов.{' '}
              <Link href="/clients/new" className="text-blue-600 hover:underline">
                Добавить первого
              </Link>
            </>
          )}
        </div>
      ) : (
        <ul className="space-y-2">
          {(clients as Client[] | null)?.map((c) => (
            <li key={c.id}>
              <Link
                href={`/clients/${c.id}`}
                className="block bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 hover:border-blue-500 transition"
              >
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-medium truncate">{c.full_name}</h3>
                    {c.phone && (
                      <p className="text-sm text-neutral-500 mt-0.5">
                        {c.phone}
                      </p>
                    )}
                    {c.address && (
                      <p className="text-xs text-neutral-400 mt-0.5 truncate">
                        {c.address}
                      </p>
                    )}
                  </div>
                  <span className="text-neutral-400 text-lg ml-2">›</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}