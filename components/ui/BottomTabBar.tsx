'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, ClipboardList, Users, Menu } from 'lucide-react';
import { useI18n } from '@/components/i18n/LocaleProvider';

type Props = {
  onOpenMore: () => void;
};

export default function BottomTabBar({ onOpenMore }: Props) {
  const pathname = usePathname() ?? '';
  const { t } = useI18n();

  const tabs = [
    { href: '/dashboard', label: t.nav.dashboard, icon: Home, matcher: /^\/dashboard/ },
    { href: '/orders', label: t.nav.orders, icon: ClipboardList, matcher: /^\/orders/ },
    { href: '/clients', label: t.nav.clients, icon: Users, matcher: /^\/clients/ },
  ];

  const matchedTab = tabs.find((tab) => tab.matcher.test(pathname));
  const moreActive = !matchedTab;

  return (
    <nav
      className="sm:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800 z-40"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-stretch justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = tab.matcher.test(pathname);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 transition ${
                active ? 'text-blue-600 dark:text-blue-400' : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200'
              }`}
            >
              <Icon size={22} strokeWidth={active ? 2.5 : 2} />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </Link>
          );
        })}

        <button
          type="button"
          onClick={onOpenMore}
          className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 transition ${
            moreActive ? 'text-blue-600 dark:text-blue-400' : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200'
          }`}
        >
          <Menu size={22} strokeWidth={moreActive ? 2.5 : 2} />
          <span className="text-[10px] font-medium">{t.nav.more}</span>
        </button>
      </div>
    </nav>
  );
}
