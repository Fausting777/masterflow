import 'server-only';

import { cookies } from 'next/headers';
import { CSRF_COOKIE_NAME, CSRF_FORM_FIELD } from '@/lib/csrf/shared';

export async function getCsrfToken() {
  const cookieStore = await cookies();
  return cookieStore.get(CSRF_COOKIE_NAME)?.value ?? '';
}

export async function validateCsrfFormData(formData: FormData) {
  const cookieStore = await cookies();
  const cookieToken = cookieStore.get(CSRF_COOKIE_NAME)?.value;
  const formToken = formData.get(CSRF_FORM_FIELD);

  if (
    !cookieToken ||
    typeof formToken !== 'string' ||
    formToken.length === 0 ||
    formToken !== cookieToken
  ) {
    throw new Error('Invalid CSRF token');
  }
}
