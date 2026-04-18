// lib/email/resend.ts
import { Resend } from 'resend';

let client: Resend | null = null;

export function getResendClient(): Resend {
  if (client) return client;
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('RESEND_API_KEY не задан в окружении');
  }
  client = new Resend(apiKey);
  return client;
}