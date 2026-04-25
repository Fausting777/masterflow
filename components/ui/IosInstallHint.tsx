'use client';

import { useEffect, useState } from 'react';
import { useI18n } from '@/components/i18n/LocaleProvider';

export default function IosInstallHint() {
  const [show, setShow] = useState(false);
  const { locale } = useI18n();

  const text =
    locale === 'de'
      ? {
          title: 'Zum Home-Bildschirm hinzufuegen',
          body:
            'Tippe in Safari auf "Teilen" und waehle dann "Zum Home-Bildschirm", um MasterFlow wie eine App zu installieren.',
          dismiss: 'Verstanden',
          icon: 'iOS',
        }
      : {
          title: 'Добавить на главный экран',
          body:
            'Нажми в Safari кнопку «Поделиться», затем выбери «На экран Домой», чтобы установить MasterFlow как приложение.',
          dismiss: 'Понятно',
          icon: 'iOS',
        };

  useEffect(() => {
    const isIos = /iPhone|iPad|iPod/.test(navigator.userAgent);
    const isStandalone =
      'standalone' in window.navigator &&
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

    if (!isIos || isStandalone) return;
    if (localStorage.getItem('ios-hint-seen')) return;

    const timeoutId = setTimeout(() => setShow(true), 10_000);
    return () => clearTimeout(timeoutId);
  }, []);

  function handleDismiss() {
    localStorage.setItem('ios-hint-seen', '1');
    setShow(false);
  }

  if (!show) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-40 rounded-xl border border-neutral-200 bg-white p-4 shadow-lg sm:left-auto sm:max-w-sm dark:border-neutral-700 dark:bg-neutral-900">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-sm font-semibold text-white">
          {text.icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium">{text.title}</div>
          <div className="mt-1 text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">{text.body}</div>
          <button
            type="button"
            onClick={handleDismiss}
            className="mt-3 text-sm text-blue-600 hover:text-blue-700"
          >
            {text.dismiss}
          </button>
        </div>
      </div>
    </div>
  );
}
