'use client';

import { createContext, useContext } from 'react';
import { getMessages, type Locale } from '@/lib/i18n/shared';

type LocaleContextValue = {
  locale: Locale;
  t: ReturnType<typeof getMessages>;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: React.ReactNode;
}) {
  return (
    <LocaleContext.Provider value={{ locale, t: getMessages(locale) }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(LocaleContext);

  if (!context) {
    throw new Error('useI18n must be used inside LocaleProvider');
  }

  return context;
}
