import Link from 'next/link';
import OrderForm from '@/components/forms/OrderForm';
import { getLocale } from '@/lib/i18n/server';
import { createClient } from '@/lib/supabase/server';
import type { Client, Service } from '@/types/database';
import { createOrderAction } from '../actions';

export default async function NewOrderPage() {
  const supabase = await createClient();
  const locale = await getLocale();

  const [clientsRes, servicesRes] = await Promise.all([
    supabase.from('clients').select('*').order('full_name'),
    supabase.from('services').select('*').order('title'),
  ]);

  const text =
    locale === 'de'
      ? {
          back: 'Zurück zur Liste',
          title: 'Neuer Auftrag',
          submit: 'Auftrag erstellen',
        }
      : {
          back: 'Назад к списку',
          title: 'Новый заказ',
          submit: 'Создать заказ',
        };

  return (
    <div className="max-w-lg">
      <div className="mb-4">
        <Link href="/orders" className="text-sm text-neutral-500 hover:text-neutral-700">
          ← {text.back}
        </Link>
      </div>
      <h1 className="mb-4 text-2xl font-semibold">{text.title}</h1>
      <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
        <OrderForm
          action={createOrderAction}
          clients={(clientsRes.data ?? []) as Client[]}
          services={(servicesRes.data ?? []) as Service[]}
          cancelHref="/orders"
          submitLabel={text.submit}
        />
      </div>
    </div>
  );
}
