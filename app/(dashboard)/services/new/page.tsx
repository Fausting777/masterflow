import Link from 'next/link';
import ServiceForm from '@/components/forms/ServiceForm';
import { getDictionary } from '@/lib/i18n/server';
import { createServiceAction } from '../actions';

export default async function NewServicePage() {
  const { t } = await getDictionary();

  return (
    <div className="max-w-lg">
      <div className="mb-4">
        <Link href="/services" className="text-sm text-neutral-500 hover:text-neutral-700">
          ← {t.nav.services}
        </Link>
      </div>
      <h1 className="text-2xl font-semibold mb-4">+ {t.servicesPage.new}</h1>
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5">
        <ServiceForm action={createServiceAction} cancelHref="/services" submitLabel={t.fab.create} />
      </div>
    </div>
  );
}
