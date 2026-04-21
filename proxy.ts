import { NextResponse, type NextRequest } from 'next/server';
import {
  applyCsrfCookie,
  CSRF_COOKIE_NAME,
  CSRF_FORM_FIELD,
  CSRF_HEADER_NAME,
  generateCsrfToken,
  isValidOrigin,
} from '@/lib/csrf/middleware';
import { updateSession } from '@/lib/supabase/middleware';

const CSRF_PROTECTED_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

async function readCsrfTokenFromRequest(request: NextRequest) {
  const headerToken = request.headers.get(CSRF_HEADER_NAME);
  if (headerToken) {
    return headerToken;
  }

  const contentType = request.headers.get('content-type') ?? '';
  if (
    contentType.includes('application/x-www-form-urlencoded') ||
    contentType.includes('multipart/form-data') ||
    contentType.includes('text/plain')
  ) {
    try {
      const formData = await request.clone().formData();
      const formToken = formData.get(CSRF_FORM_FIELD);
      return typeof formToken === 'string' ? formToken : null;
    } catch {
      return null;
    }
  }

  return null;
}

async function isValidCsrfRequest(request: NextRequest) {
  if (!CSRF_PROTECTED_METHODS.has(request.method)) {
    return true;
  }

  if (!isValidOrigin(request)) {
    return false;
  }

  if (request.headers.has('next-action')) {
    return true;
  }

  const cookieToken = request.cookies.get(CSRF_COOKIE_NAME)?.value;
  const requestToken = await readCsrfTokenFromRequest(request);

  return Boolean(cookieToken && requestToken && cookieToken === requestToken);
}

export async function proxy(request: NextRequest) {
  let csrfToken = request.cookies.get(CSRF_COOKIE_NAME)?.value;

  if (!csrfToken) {
    csrfToken = generateCsrfToken();
    request.cookies.set(CSRF_COOKIE_NAME, csrfToken);
  }

  if (!(await isValidCsrfRequest(request))) {
    return NextResponse.json({ error: 'CSRF validation failed' }, { status: 403 });
  }

  const response = await updateSession(request);
  applyCsrfCookie(response, request, csrfToken);

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|_next/data|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ttf)$).*)',
  ],
};
