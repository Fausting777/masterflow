import Link from 'next/link';
import { Wrench } from 'lucide-react';
import EmptyState from '@/components/ui/EmptyState';
import { getDictionary } from '@/lib/i18n/server';
import { createClient } from '@/lib/supabase/server';
import { formatPrice } from '@/lib/utils/format';
import type { Service } from '@/types/database';

export default async function ServicesPage() {
  const supabase = await createClient();
  const { t } = await getDictionary();
  const { data: services, error } = await supabase.from('services').select('*').order('title', { ascending: true });

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">{t.servicesPage.title}</h1>
        <Link
          href="/services/new"
          className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2"
        >
          + {t.servicesPage.new}
        </Link>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700 mb-4">
          {t.servicesPage.error}: {error.message}
        </div>
      )}

      {services && services.length === 0 ? (
        <EmptyState
          icon={Wrench}
          title={t.servicesPage.empty}
          action={{ href: '/services/new', label: t.servicesPage.addFirst }}
        />
      ) : (
        <ul className="space-y-2">
          {(services as Service[] | null)?.map((s) => (
            <li key={s.id}>
              <Link
                href={`/services/${s.id}`}
                className="block bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 hover:border-blue-500 transition"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-medium truncate">{s.title}</h3>
                    {s.description && <p className="text-sm text-neutral-500 mt-0.5 truncate">{s.description}</p>}
                  </div>
                  <div className="text-right">
                    <div className="font-semibold whitespace-nowrap">{formatPrice(s.default_price)}</div>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
