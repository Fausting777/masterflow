'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  LOCALE_COOKIE_NAME,
  SUPPORTED_LOCALES,
  type Locale,
} from '@/lib/i18n/shared';
import { useI18n } from '@/components/i18n/LocaleProvider';

function persistLocale(nextLocale: Locale) {
  window.document.cookie = `${LOCALE_COOKIE_NAME}=${nextLocale}; Path=/; Max-Age=31536000; SameSite=Lax`;
}

export default function LanguageSwitcher() {
  const router = useRouter();
  const { locale, t } = useI18n();
  const [isPending, startTransition] = useTransition();

  function handleChange(nextLocale: Locale) {
    if (nextLocale === locale) return;

    persistLocale(nextLocale);
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <div className="inline-flex items-center gap-2 text-xs text-neutral-500">
      <span>{t.language.label}</span>
      <div className="inline-flex rounded-lg border border-neutral-200 bg-white p-1 dark:border-neutral-700 dark:bg-neutral-800">
        {SUPPORTED_LOCALES.map((item) => {
          const active = item === locale;
          const label = item === 'ru' ? t.language.ru : t.language.de;

          return (
            <button
              key={item}
              type="button"
              onClick={() => handleChange(item)}
              disabled={isPending || active}
              className={`rounded-md px-2 py-1 transition ${
                active
                  ? 'bg-blue-600 text-white'
                  : 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-700'
              } disabled:cursor-default`}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
