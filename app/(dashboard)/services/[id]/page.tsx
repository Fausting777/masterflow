import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import ServiceForm from '@/components/forms/ServiceForm';
import DeleteServiceButton from '@/components/forms/DeleteServiceButton';
import { updateServiceAction } from '../actions';
import { formatPrice } from '@/lib/utils/format';
import type { Service } from '@/types/database';

type Params = Promise<{ id: string }>;
type SearchParams = Promise<{ edit?: string }>;

export default async function ServicePage({
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
  const { data: service } = await supabase
    .from('services')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (!service) notFound();
  const s = service as Service;

  const boundUpdate = updateServiceAction.bind(null, s.id);

  return (
    <div className="max-w-lg">
      <div className="mb-4">
        <Link href="/services" className="text-sm text-neutral-500 hover:text-neutral-700">
          ← Назад к списку
        </Link>
      </div>

      {isEditing ? (
        <>
          <h1 className="text-2xl font-semibold mb-4">Редактировать услугу</h1>
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5">
            <ServiceForm action={boundUpdate} initial={s} cancelHref={`/services/${s.id}`} submitLabel="Сохранить" />
          </div>
        </>
      ) : (
        <>
          <div className="flex items-center justify-between mb-4 gap-3">
            <h1 className="text-2xl font-semibold truncate">{s.title}</h1>
            <Link
              href={`/services/${s.id}?edit=1`}
              className="rounded-lg border border-neutral-300 dark:border-neutral-700 text-sm font-medium px-4 py-2 hover:bg-neutral-50 dark:hover:bg-neutral-800 whitespace-nowrap"
            >
              Редактировать
            </Link>
          </div>

          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 space-y-3 mb-4">
            <div className="flex justify-between">
              <span className="text-sm text-neutral-500">Цена</span>
              <span className="text-sm font-medium">{formatPrice(s.default_price)}</span>
            </div>
            {s.description && (
              <div>
                <span className="text-sm text-neutral-500">Описание</span>
                <p className="text-sm mt-1 whitespace-pre-wrap">{s.description}</p>
              </div>
            )}
          </div>

          <DeleteServiceButton serviceId={s.id} />
        </>
      )}
    </div>
  );
}