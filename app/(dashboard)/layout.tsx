import MobileShell from '@/components/ui/MobileShell';
import InstallButton from '@/components/ui/InstallButton';
import IosInstallHint from '@/components/ui/IosInstallHint';
import ThemeToggle from '@/components/ui/ThemeToggle';
import CsrfTokenInput from '@/components/security/CsrfTokenInput';
import { createClient } from '@/lib/supabase/server';
import { getDictionary } from '@/lib/i18n/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { t } = await getDictionary();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      <header className="border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <Link href="/dashboard" className="font-semibold shrink-0 text-neutral-900 dark:text-neutral-100">
            MasterFlow
          </Link>

          <nav className="hidden sm:flex items-center gap-4 text-sm">
            <Link href="/dashboard" className="text-neutral-700 dark:text-neutral-300 hover:text-blue-600 dark:hover:text-blue-400">
              {t.nav.dashboard}
            </Link>
            <Link href="/orders" className="text-neutral-700 dark:text-neutral-300 hover:text-blue-600 dark:hover:text-blue-400">
              {t.nav.orders}
            </Link>
            <Link href="/invoices" className="text-neutral-700 dark:text-neutral-300 hover:text-blue-600 dark:hover:text-blue-400">
              {t.nav.invoices}
            </Link>
            <Link href="/expenses" className="text-neutral-700 dark:text-neutral-300 hover:text-blue-600 dark:hover:text-blue-400">
              {t.nav.expenses}
            </Link>
            <Link href="/clients" className="text-neutral-700 dark:text-neutral-300 hover:text-blue-600 dark:hover:text-blue-400">
              {t.nav.clients}
            </Link>
            <Link href="/services" className="text-neutral-700 dark:text-neutral-300 hover:text-blue-600 dark:hover:text-blue-400">
              {t.nav.services}
            </Link>
            <Link href="/stats" className="text-neutral-700 dark:text-neutral-300 hover:text-blue-600 dark:hover:text-blue-400">
              {t.nav.stats}
            </Link>
            <Link href="/settings" className="text-neutral-700 dark:text-neutral-300 hover:text-blue-600 dark:hover:text-blue-400">
              {t.nav.settings}
            </Link>
            <span className="text-neutral-300 dark:text-neutral-600">|</span>
            <form action="/auth/signout" method="post">
              <CsrfTokenInput />
              <button
                type="submit"
                className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-red-600 dark:hover:text-red-400"
              >
                {t.nav.logout}
              </button>
            </form>
          </nav>

          <ThemeToggle />
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 pb-24 sm:pb-6 page-enter">
        {children}
      </main>

      <MobileShell />

      <InstallButton />
      <IosInstallHint />
    </div>
  );
}
