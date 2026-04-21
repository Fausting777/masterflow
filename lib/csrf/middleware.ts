import type { NextRequest, NextResponse } from 'next/server';
import {
  CSRF_COOKIE_NAME,
  CSRF_HEADER_NAME,
  CSRF_FORM_FIELD,
} from '@/lib/csrf/shared';

const CSRF_COOKIE_MAX_AGE = 60 * 60 * 8;

export { CSRF_COOKIE_NAME, CSRF_HEADER_NAME, CSRF_FORM_FIELD };

export function generateCsrfToken() {
  return `${crypto.randomUUID()}${crypto.randomUUID()}`.replaceAll('-', '');
}

export function getAllowedOrigins(request: NextRequest) {
  const allowedOrigins = new Set<string>([request.nextUrl.origin]);
  const forwardedHost = request.headers.get('x-forwarded-host');
  const forwardedProto =
    request.headers.get('x-forwarded-proto') ?? request.nextUrl.protocol.replace(':', '');

  if (forwardedHost) {
    allowedOrigins.add(`${forwardedProto}://${forwardedHost}`);
  }

  return allowedOrigins;
}

export function isValidOrigin(request: NextRequest) {
  const origin = request.headers.get('origin');

  if (!origin) {
    return false;
  }

  return getAllowedOrigins(request).has(origin);
}

export function applyCsrfCookie(
  response: NextResponse,
  request: NextRequest,
  csrfToken: string
) {
  response.cookies.set(CSRF_COOKIE_NAME, csrfToken, {
    httpOnly: false,
    sameSite: 'lax',
    secure: request.nextUrl.protocol === 'https:',
    path: '/',
    maxAge: CSRF_COOKIE_MAX_AGE,
  });
}

