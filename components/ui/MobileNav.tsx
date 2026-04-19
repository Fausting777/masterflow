'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/dashboard', label: 'Главная' },
  { href: '/orders', label: 'Заказы' },
  { href: '/invoices', label: 'Счета' },          // ← новое
  { href: '/expenses', label: 'Расходы' },       // ← новое
  { href: '/clients', label: 'Клиенты' },
  { href: '/services', label: 'Услуги' },
  { href: '/stats', label: 'Статистика' },    // ← новое
  { href: '/settings', label: 'Настройки' },
];

export default function MobileNav({ userEmail }: { userEmail?: string | null }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="sm:hidden w-10 h-10 flex items-center justify-center rounded-lg hover:bg-neutral-100 -mr-2"
        aria-label="Меню"
      >
        <span className="text-xl">{open ? '✕' : '☰'}</span>
      </button>

      {open && (
        <>
          <div
            className="sm:hidden fixed inset-0 bg-black/30 z-40"
            onClick={() => setOpen(false)}
          />
          <nav className="sm:hidden fixed top-0 right-0 bottom-0 w-64 max-w-[80vw] bg-white z-50 shadow-xl flex flex-col">
            <div className="p-4 border-b border-neutral-200 flex items-center justify-between">
              <span className="font-semibold">Меню</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-neutral-100"
                aria-label="Закрыть"
              >
                ✕
              </button>
            </div>

            <ul className="flex-1 py-2">
              {LINKS.map((link) => {
                const active = pathname === link.href || pathname.startsWith(link.href + '/');
                return (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      onClick={() => setOpen(false)}
                      className={`block px-4 py-3 text-sm ${
                        active
                          ? 'bg-blue-50 text-blue-700 font-medium'
                          : 'text-neutral-700 hover:bg-neutral-50'
                      }`}
                    >
                      {link.label}
                    </Link>
                  </li>
                );
              })}
            </ul>

            <div className="p-4 border-t border-neutral-200">
              {userEmail && (
                <p className="text-xs text-neutral-500 mb-2 truncate">{userEmail}</p>
              )}
              <form action="/auth/signout" method="post">
                <button
                  type="submit"
                  className="w-full text-left text-sm text-red-600 hover:text-red-700"
                >
                  Выйти
                </button>
              </form>
            </div>
          </nav>
        </>
      )}
    </>
  );
}