import LanguageSwitcher from '@/components/i18n/LanguageSwitcher';
import { getDictionary } from '@/lib/i18n/server';

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { t } = await getDictionary();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-neutral-50 dark:bg-neutral-950">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">MasterFlow</h1>
            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
              {t.app.description}
            </p>
          </div>
          <LanguageSwitcher compact />
        </div>
        <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-sm border border-neutral-200 dark:border-neutral-800 p-6">
          {children}
        </div>
      </div>
      {/* footer links hidden */}
    </div>
  );
}
