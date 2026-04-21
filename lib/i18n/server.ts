import 'server-only';

import { cookies } from 'next/headers';
import {
  DEFAULT_LOCALE,
  getMessages,
  isLocale,
  LOCALE_COOKIE_NAME,
  type Locale,
} from '@/lib/i18n/shared';

export async function getLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const locale = cookieStore.get(LOCALE_COOKIE_NAME)?.value;

  return locale && isLocale(locale) ? locale : DEFAULT_LOCALE;
}

export async function getDictionary() {
  const locale = await getLocale();
  return {
    locale,
    t: getMessages(locale),
  };
}
