import Link from 'next/link';
import { Users, SearchX } from 'lucide-react';
import EmptyState from '@/components/ui/EmptyState';
import { getLocale } from '@/lib/i18n/server';
import { createClient } from '@/lib/supabase/server';
import type { Client } from '@/types/database';

type SearchParams = Promise<{ q?: string }>;

export default async function ClientsPage({ searchParams }: { searchParams: SearchParams }) {
  const { q } = await searchParams;
  const search = (q ?? '').trim();
  const locale = await getLocale();
  const text =
    locale === 'de'
      ? {
          title: 'Kunden',
          new: 'Neu',
          searchPlaceholder: 'Suche nach Name oder Telefon...',
          loadError: 'Fehler beim Laden',
          emptySearch: 'Nichts gefunden fuer die Suche',
          emptyDefault: 'Noch keine Kunden.',
          addFirst: 'Ersten hinzufuegen',
        }
      : {
          title: '\u041a\u043b\u0438\u0435\u043d\u0442\u044b',
          new: '\u041d\u043e\u0432\u044b\u0439',
          searchPlaceholder: '\u041f\u043e\u0438\u0441\u043a \u043f\u043e \u0438\u043c\u0435\u043d\u0438 \u0438\u043b\u0438 \u0442\u0435\u043b\u0435\u0444\u043e\u043d\u0443...',
          loadError: '\u041e\u0448\u0438\u0431\u043a\u0430 \u0437\u0430\u0433\u0440\u0443\u0437\u043a\u0438',
          emptySearch: '\u041d\u0438\u0447\u0435\u0433\u043e \u043d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d\u043e \u043f\u043e \u0437\u0430\u043f\u0440\u043e\u0441\u0443',
          emptyDefault: '\u041f\u043e\u043a\u0430 \u043d\u0435\u0442 \u043a\u043b\u0438\u0435\u043d\u0442\u043e\u0432.',
          addFirst: '\u0414\u043e\u0431\u0430\u0432\u0438\u0442\u044c \u043f\u0435\u0440\u0432\u043e\u0433\u043e',
        };

  const supabase = await createClient();

  let query = supabase.from('clients').select('*').order('created_at', { ascending: false });

  if (search.length > 0) {
    query = query.or(`full_name.ilike.%${search}%,phone.ilike.%${search}%`);
  }

  const { data: clients, error } = await query;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{text.title}</h1>
        <Link
          href="/clients/new"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          + {text.new}
        </Link>
      </div>

      <form action="/clients" className="mb-4">
        <input
          type="text"
          name="q"
          defaultValue={search}
          placeholder={text.searchPlaceholder}
          className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-neutral-700 dark:bg-neutral-900"
        />
      </form>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {text.loadError}: {error.message}
        </div>
      )}

      {clients && clients.length === 0 ? (
        search ? (
          <EmptyState
            icon={SearchX}
            title={`${text.emptySearch} "${search}"`}
          />
        ) : (
          <EmptyState
            icon={Users}
            title={text.emptyDefault}
            action={{ href: '/clients/new', label: text.addFirst }}
          />
        )
      ) : (
        <ul className="space-y-2">
          {(clients as Client[] | null)?.map((c) => (
            <li key={c.id}>
              <Link
                href={`/clients/${c.id}`}
                className="block rounded-xl border border-neutral-200 bg-white p-4 transition duration-200 hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98] dark:border-neutral-800 dark:bg-neutral-900"
              >
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-medium">{c.full_name}</h3>
                    {c.phone && <p className="mt-0.5 text-sm text-neutral-500">{c.phone}</p>}
                    {c.address && <p className="mt-0.5 truncate text-xs text-neutral-400">{c.address}</p>}
                  </div>
                  <span className="ml-2 text-lg text-neutral-400">→</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
