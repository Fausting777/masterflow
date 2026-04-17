// app/page.tsx
import { createClient } from '@/lib/supabase/server';

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <main className="min-h-screen flex items-center justify-center p-8">
      <div className="max-w-md w-full bg-white dark:bg-neutral-900 rounded-2xl shadow-sm border border-neutral-200 dark:border-neutral-800 p-8">
        <h1 className="text-2xl font-semibold mb-2">MasterFlow</h1>
        <p className="text-neutral-600 dark:text-neutral-400 mb-6">
          Приложение для мастеров — MVP
        </p>
        <div className="text-sm space-y-2">
          <div className="flex justify-between">
            <span className="text-neutral-500">Supabase connection:</span>
            <span className="text-green-600 font-medium">✓ OK</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-500">User:</span>
            <span className="font-mono text-xs">
              {user ? user.email : 'not logged in'}
            </span>
          </div>
        </div>
      </div>
    </main>
  );
}