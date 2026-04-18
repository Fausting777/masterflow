import InstallButton from '@/components/ui/InstallButton';
import IosInstallHint from '@/components/ui/IosInstallHint';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import MobileNav from '@/components/ui/MobileNav';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="border-b border-neutral-200 bg-white sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <Link href="/dashboard" className="font-semibold shrink-0">
            MasterFlow
          </Link>

          {/* Десктоп-меню */}
          <nav className="hidden sm:flex items-center gap-4 text-sm">
            <Link href="/dashboard" className="text-neutral-700 hover:text-blue-600">
              Главная
            </Link>
            <Link href="/orders" className="text-neutral-700 hover:text-blue-600">
              Заказы
            </Link>
            <Link href="/invoices" className="text-neutral-700 hover:text-blue-600">
  Счета
</Link>
            <Link href="/clients" className="text-neutral-700 hover:text-blue-600">
              Клиенты
            </Link>
            <Link href="/services" className="text-neutral-700 hover:text-blue-600">
              Услуги
            </Link>
            <Link href="/stats" className="text-neutral-700 hover:text-blue-600">
  Статистика
</Link>
            <Link href="/settings" className="text-neutral-700 hover:text-blue-600">
  Настройки
</Link>
            <span className="text-neutral-300">|</span>
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="text-sm text-neutral-600 hover:text-red-600"
              >
                Выйти
              </button>
            </form>
          </nav>

          {/* Мобильное меню */}
          <MobileNav userEmail={user.email} />
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-6">{children}</main>
      <InstallButton />           {/* ← новое */}
      <IosInstallHint />
    </div>
  );
}