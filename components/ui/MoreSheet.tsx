'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import {
  FileText,
  Wallet,
  Wrench,
  BarChart3,
  Settings,
  LogOut,
  X,
} from 'lucide-react';

const MORE_ITEMS = [
  { href: '/invoices', label: 'Счета', icon: FileText, color: 'text-blue-600' },
  { href: '/expenses', label: 'Расходы', icon: Wallet, color: 'text-rose-600' },
  { href: '/services', label: 'Услуги', icon: Wrench, color: 'text-amber-600' },
  { href: '/stats', label: 'Статистика', icon: BarChart3, color: 'text-green-600' },
  { href: '/settings', label: 'Настройки', icon: Settings, color: 'text-neutral-600' },
];

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function MoreSheet({ open, onClose }: Props) {
  // Закрытие по Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Блокируем скролл body когда открыто
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <>
      {/* Полупрозрачный оверлей */}
      <div
        className={`sm:hidden fixed inset-0 bg-black/50 z-50 transition-opacity ${
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Панель */}
      <div
        className={`sm:hidden fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl z-50 transition-transform duration-300 ${
          open ? 'translate-y-0' : 'translate-y-full'
        }`}
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {/* Полоска-хендл */}
        <div className="flex justify-center pt-2 pb-1">
          <div className="w-10 h-1 bg-neutral-300 rounded-full" />
        </div>

        <div className="flex items-center justify-between px-5 py-3 border-b border-neutral-100">
          <h2 className="font-semibold text-base">Меню</h2>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-neutral-100"
            aria-label="Закрыть"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="py-2">
          {MORE_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className="flex items-center gap-3 px-5 py-3.5 hover:bg-neutral-50 active:bg-neutral-100"
              >
                <div className={`${item.color}`}>
                  <Icon size={22} />
                </div>
                <span className="text-base font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-neutral-100 py-2">
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-red-50 active:bg-red-100 text-red-600"
            >
              <LogOut size={22} />
              <span className="text-base font-medium">Выйти</span>
            </button>
          </form>
        </div>
      </div>
    </>
  );
}