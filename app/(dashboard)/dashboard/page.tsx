import { createClient } from '@/lib/supabase/server';

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Забираем профиль из public.profiles
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user!.id)
    .single();

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">Рабочий стол</h1>

      <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-5 mb-4">
        <h2 className="text-sm font-medium text-neutral-500 dark:text-neutral-400 mb-3">
          Аккаунт
        </h2>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-neutral-500">Email:</dt>
            <dd className="font-medium">{user!.email}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-neutral-500">User ID:</dt>
            <dd className="font-mono text-xs">{user!.id.slice(0, 8)}…</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-neutral-500">Профиль в БД:</dt>
            <dd className="font-medium">
              {profile ? (
                <span className="text-green-600">✓ создан</span>
              ) : (
                <span className="text-red-600">✗ не найден</span>
              )}
            </dd>
          </div>
        </dl>
      </div>

      <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-xl p-4 text-sm text-blue-800 dark:text-blue-300">
        🚧 Следующий этап — управление клиентами. Пока это заглушка, чтобы убедиться, что авторизация работает.
      </div>
    </div>
  );
}