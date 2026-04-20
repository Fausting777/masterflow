'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, ClipboardList, Users, Menu } from 'lucide-react';

const TABS = [
  { href: '/dashboard', label: 'Главная', icon: Home, matcher: /^\/dashboard/ },
  { href: '/orders', label: 'Заказы', icon: ClipboardList, matcher: /^\/orders/ },
  { href: '/clients', label: 'Клиенты', icon: Users, matcher: /^\/clients/ },
];

type Props = {
  onOpenMore: () => void;
};

export default function BottomTabBar({ onOpenMore }: Props) {
  const pathname = usePathname() ?? '';

  // Активен ли пункт «Ещё» — если pathname не совпадает ни с одним из других табов
  const matchedTab = TABS.find(t => t.matcher.test(pathname));
  const moreActive = !matchedTab;

  return (
    <nav
      className="sm:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-neutral-200 z-40"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-stretch justify-around">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = tab.matcher.test(pathname);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 transition ${
                active ? 'text-blue-600' : 'text-neutral-500 hover:text-neutral-800'
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
            moreActive ? 'text-blue-600' : 'text-neutral-500 hover:text-neutral-800'
          }`}
        >
          <Menu size={22} strokeWidth={moreActive ? 2.5 : 2} />
          <span className="text-[10px] font-medium">Ещё</span>
        </button>
      </div>
    </nav>
  );
}