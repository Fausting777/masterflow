'use client';

import { useSyncExternalStore } from 'react';
import { CSRF_COOKIE_NAME, CSRF_FORM_FIELD } from '@/lib/csrf/shared';

function readCookieValue(name: string) {
  if (typeof document === 'undefined') {
    return '';
  }

  const cookie = document.cookie
    .split('; ')
    .find((entry) => entry.startsWith(`${name}=`));

  return cookie ? decodeURIComponent(cookie.slice(name.length + 1)) : '';
}

function subscribe(onStoreChange: () => void) {
  if (typeof window === 'undefined') {
    return () => {};
  }

  window.addEventListener('focus', onStoreChange);
  return () => window.removeEventListener('focus', onStoreChange);
}

export default function CsrfTokenInput() {
  const csrfToken = useSyncExternalStore(
    subscribe,
    () => readCookieValue(CSRF_COOKIE_NAME),
    () => ''
  );

  return <input type="hidden" name={CSRF_FORM_FIELD} value={csrfToken} />;
}
