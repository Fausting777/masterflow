import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { count: clientsCount } = await supabase
    .from('clients')
    .select('*', { count: 'exact', head: true });

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">Рабочий стол</h1>
      <p className="text-sm text-neutral-500 mb-6">
        Добро пожаловать, {user!.email}
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/clients"
          className="block bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 hover:border-blue-500 transition"
        >
          <div className="text-sm text-neutral-500 mb-1">Клиенты</div>
          <div className="text-3xl font-semibold">{clientsCount ?? 0}</div>
          <div className="text-xs text-blue-600 mt-2">Управлять →</div>
        </Link>

        <div className="block bg-neutral-100 dark:bg-neutral-900/50 border border-dashed border-neutral-300 dark:border-neutral-700 rounded-xl p-5 text-neutral-400">
          <div className="text-sm mb-1">Заказы</div>
          <div className="text-3xl font-semibold">—</div>
          <div className="text-xs mt-2">Скоро (Этап 7)</div>
        </div>
      </div>
    </div>
  );
}