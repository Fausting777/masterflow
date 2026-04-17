import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Дополнительная страховка — middleware уже редиректит, но пусть будет
  if (!user) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      <header className="border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/dashboard" className="font-semibold">
            MasterFlow
          </Link>
          <nav className="flex items-center gap-4 text-sm">
           <Link
  href="/dashboard"
  className="text-neutral-700 dark:text-neutral-300 hover:text-blue-600"
>
  Главная
</Link>
<Link
  href="/clients"
  className="text-neutral-700 dark:text-neutral-300 hover:text-blue-600"
>
  Клиенты
</Link>
            <span className="text-neutral-400 dark:text-neutral-600">|</span>
            <span className="text-neutral-500 text-xs hidden sm:inline">
              {user.email}
            </span>
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-red-600"
              >
                Выйти
              </button>
            </form>
          </nav>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}