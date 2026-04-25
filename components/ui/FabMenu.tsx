'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Plus, ClipboardList, UserPlus, Wallet } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useI18n } from '@/components/i18n/LocaleProvider';

const HIDE_ON = ['/new', '/edit', '/signature', '/login', '/register'];

export default function FabMenu() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname() ?? '';
  const { t } = useI18n();

  const actions = [
    { href: '/orders/new', label: t.fab.newOrder, icon: ClipboardList, color: 'bg-blue-600' },
    { href: '/clients/new', label: t.fab.newClient, icon: UserPlus, color: 'bg-green-600' },
    { href: '/expenses/new', label: t.fab.newExpense, icon: Wallet, color: 'bg-rose-600' },
  ];

  const shouldHide = HIDE_ON.some((segment) => pathname.includes(segment));

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setOpen(false);
    }, 0);
    return () => clearTimeout(timer);
  }, [pathname]);

  if (shouldHide) return null;

  return (
    <>
      <div
        className={`sm:hidden fixed inset-0 bg-black/30 z-40 transition-opacity ${
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setOpen(false)}
      />

      <div
        className="sm:hidden fixed right-4 z-50 flex flex-col items-end gap-2"
        style={{ bottom: 'calc(env(safe-area-inset-bottom) + 10rem)' }}
      >
        {actions.map((action, i) => {
          const Icon = action.icon;
          return (
            <div
              key={action.href}
              className="flex items-center gap-2 transition-all duration-200 ease-out"
              style={{
                opacity: open ? 1 : 0,
                transform: open ? 'translateY(0) scale(1)' : 'translateY(14px) scale(0.9)',
                transitionDelay: open ? `${i * 55}ms` : '0ms',
                pointerEvents: open ? 'auto' : 'none',
              }}
            >
              <span className="bg-white border border-neutral-200 shadow-md rounded-lg px-3 py-1.5 text-sm font-medium whitespace-nowrap dark:bg-neutral-900 dark:border-neutral-700 dark:text-neutral-100">
                {action.label}
              </span>
              <Link
                href={action.href}
                onClick={() => setOpen(false)}
                className={`${action.color} w-12 h-12 rounded-full flex items-center justify-center shadow-lg text-white hover:scale-110 active:scale-95 transition-transform duration-150`}
              >
                <Icon size={22} />
              </Link>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="sm:hidden fixed right-4 z-50 w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-700 active:scale-95 text-white shadow-xl flex items-center justify-center transition-all duration-200"
        style={{ bottom: 'calc(env(safe-area-inset-bottom) + 6rem)' }}
        aria-label={open ? t.fab.closeMenu : t.fab.create}
      >
        <div className={`transition-transform duration-300 ease-in-out ${open ? 'rotate-45' : 'rotate-0'}`}>
          <Plus size={26} />
        </div>
      </button>
    </>
  );
}
