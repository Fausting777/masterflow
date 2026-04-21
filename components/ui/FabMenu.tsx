'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Plus, ClipboardList, UserPlus, Wallet, X } from 'lucide-react';
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
        className={`sm:hidden fixed inset-0 bg-black/30 z-30 transition-opacity ${
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setOpen(false)}
      />

      <div
        className={`sm:hidden fixed right-4 z-40 flex flex-col items-end gap-2 transition-all ${
          open
            ? 'opacity-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
        style={{ bottom: 'calc(env(safe-area-inset-bottom) + 5.5rem)' }}
      >
        {actions.map((action, i) => {
          const Icon = action.icon;
          return (
            <div
              key={action.href}
              className="flex items-center gap-2"
              style={{
                transitionDelay: open ? `${i * 30}ms` : '0ms',
              }}
            >
              <span className="bg-white border border-neutral-200 shadow-md rounded-lg px-3 py-1.5 text-sm font-medium whitespace-nowrap">
                {action.label}
              </span>
              <Link
                href={action.href}
                onClick={() => setOpen(false)}
                className={`${action.color} w-12 h-12 rounded-full flex items-center justify-center shadow-lg text-white hover:scale-110 active:scale-95 transition-transform`}
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
        className="sm:hidden fixed right-4 z-40 w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg flex items-center justify-center transition-transform active:scale-95"
        style={{ bottom: 'calc(env(safe-area-inset-bottom) + 5rem)' }}
        aria-label={open ? t.fab.closeMenu : t.fab.create}
      >
        <div className={`transition-transform duration-300 ${open ? 'rotate-45' : ''}`}>
          {open ? <X size={24} /> : <Plus size={28} />}
        </div>
      </button>
    </>
  );
}
