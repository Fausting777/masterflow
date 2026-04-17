import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import OrderForm from '@/components/forms/OrderForm';
import { createOrderAction } from '../actions';
import type { Client, Service } from '@/types/database';

export default async function NewOrderPage() {
  const supabase = await createClient();

  const [clientsRes, servicesRes] = await Promise.all([
    supabase.from('clients').select('*').order('full_name'),
    supabase.from('services').select('*').order('title'),
  ]);

  return (
    <div className="max-w-lg">
      <div className="mb-4">
        <Link href="/orders" className="text-sm text-neutral-500 hover:text-neutral-700">
          ← Назад к списку
        </Link>
      </div>
      <h1 className="text-2xl font-semibold mb-4">Новый заказ</h1>
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5">
        <OrderForm
          action={createOrderAction}
          clients={(clientsRes.data ?? []) as Client[]}
          services={(servicesRes.data ?? []) as Service[]}
          cancelHref="/orders"
          submitLabel="Создать заказ"
        />
      </div>
    </div>
  );
}