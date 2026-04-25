'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useI18n } from '@/components/i18n/LocaleProvider';
import CsrfTokenInput from '@/components/security/CsrfTokenInput';
import {
  FileText,
  Wallet,
  Wrench,
  BarChart3,
  Settings,
  LogOut,
  X,
} from 'lucide-react';

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function MoreSheet({ open, onClose }: Props) {
  const { t } = useI18n();

  const moreItems = [
    { href: '/invoices', label: t.nav.invoices, icon: FileText, color: 'text-blue-600' },
    { href: '/expenses', label: t.nav.expenses, icon: Wallet, color: 'text-rose-600' },
    { href: '/services', label: t.nav.services, icon: Wrench, color: 'text-amber-600' },
    { href: '/stats', label: t.nav.stats, icon: BarChart3, color: 'text-green-600' },
    { href: '/settings', label: t.nav.settings, icon: Settings, color: 'text-neutral-600' },
  ];

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

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
      <div
        className={`sm:hidden fixed inset-0 bg-black/50 z-50 transition-opacity ${
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      <div
        className={`sm:hidden fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl z-50 transition-transform duration-300 ${
          open ? 'translate-y-0' : 'translate-y-full'
        }`}
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex justify-center pt-2 pb-1">
          <div className="w-10 h-1 bg-neutral-300 rounded-full" />
        </div>

        <div className="flex items-center justify-between px-5 py-3 border-b border-neutral-100">
          <h2 className="font-semibold text-base">{t.nav.menu}</h2>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-neutral-100"
            aria-label={t.nav.close}
          >
            <X size={20} />
          </button>
        </div>

        <nav className="py-2">
          {moreItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className="flex items-center gap-3 px-5 py-3.5 hover:bg-neutral-50 active:bg-neutral-100"
              >
                <div className={item.color}>
                  <Icon size={22} />
                </div>
                <span className="text-base font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-neutral-100 py-2">
          <form action="/auth/signout" method="post">
            <CsrfTokenInput />
            <button
              type="submit"
              className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-red-50 active:bg-red-100 text-red-600"
            >
              <LogOut size={22} />
              <span className="text-base font-medium">{t.nav.logout}</span>
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
