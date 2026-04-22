'use server';

import { revalidatePath } from 'next/cache';
import { getResendClient } from '@/lib/email/resend';
import { getLocale } from '@/lib/i18n/server';
import { createClient } from '@/lib/supabase/server';

type SendInput = {
  orderId: string;
  to: string;
  subject: string;
  body: string;
};

function formatFilenameTimestamp(date: Date) {
  const pad = (value: number) => String(value).padStart(2, '0');
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    '-',
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
  ].join('');
}

async function getMessages() {
  const locale = await getLocale();
  return locale === 'de'
    ? {
        missingOrder: 'Auftrag ist nicht angegeben',
        invalidRecipient: 'Ungueltige Empfaenger-E-Mail',
        emptySubject: 'Betreff ist leer',
        emptyBody: 'Text ist leer',
        unauthorized: 'Nicht autorisiert',
        orderNotFound: 'Auftrag nicht gefunden',
        pdfMissing: 'PDF wurde noch nicht erstellt',
        pdfDownloadFailed: 'PDF konnte nicht geladen werden',
        sendUnknown: 'Unbekannter Fehler beim Versand',
        sentTo: 'Rechnung gesendet an',
      }
    : {
        missingOrder: 'Заказ не указан',
        invalidRecipient: 'Некорректный email получателя',
        emptySubject: 'Тема пуста',
        emptyBody: 'Текст пуст',
        unauthorized: 'Нет авторизации',
        orderNotFound: 'Заказ не найден',
        pdfMissing: 'PDF еще не создан, сначала сгенерируйте квитанцию',
        pdfDownloadFailed: 'Не удалось загрузить PDF',
        sendUnknown: 'Неизвестная ошибка отправки',
        sentTo: 'Квитанция отправлена на',
      };
}

export async function sendInvoiceEmailAction(input: SendInput): Promise<{
  ok: boolean;
  error?: string;
}> {
  const { orderId, to, subject, body } = input;
  const m = await getMessages();

  if (!orderId) return { ok: false, error: m.missingOrder };
  if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    return { ok: false, error: m.invalidRecipient };
  }
  if (!subject.trim()) return { ok: false, error: m.emptySubject };
  if (!body.trim()) return { ok: false, error: m.emptyBody };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: m.unauthorized };

  const { data: order } = await supabase
    .from('orders')
    .select('id, user_id, pdf_file_path, invoice_number')
    .eq('id', orderId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!order) return { ok: false, error: m.orderNotFound };
  if (!order.pdf_file_path) return { ok: false, error: m.pdfMissing };

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, company_name, business_email')
    .eq('id', user.id)
    .maybeSingle();

  const { data: pdfBlob, error: dlError } = await supabase.storage
    .from('order-pdfs')
    .download(order.pdf_file_path);

  if (dlError || !pdfBlob) {
    return {
      ok: false,
      error: `${m.pdfDownloadFailed}: ${dlError?.message ?? 'error'}`,
    };
  }

  const pdfBuffer = Buffer.from(await pdfBlob.arrayBuffer());
  const timestamp = formatFilenameTimestamp(new Date());
  const filename = order.invoice_number
    ? `Rechnung-${order.invoice_number}-${timestamp}.pdf`
    : `Rechnung-${order.id.slice(0, 8)}-${timestamp}.pdf`;
  const fromName = profile?.company_name ?? profile?.full_name ?? 'MasterFlow';
  const from = `${fromName} <onboarding@resend.dev>`;

  try {
    const resend = getResendClient();
    const { error } = await resend.emails.send({
      from,
      to,
      subject,
      text: body,
      replyTo: profile?.business_email ?? user.email ?? undefined,
      attachments: [{ filename, content: pdfBuffer }],
    });

    if (error) return { ok: false, error: `Resend: ${error.message}` };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : m.sendUnknown,
    };
  }

  const sentAt = new Date().toISOString();
  await supabase
    .from('orders')
    .update({
      invoice_sent_at: sentAt,
      invoice_sent_to: to,
    })
    .eq('id', orderId)
    .eq('user_id', user.id);

  await supabase.from('activity_logs').insert({
    order_id: orderId,
    user_id: user.id,
    action_type: 'invoice_sent',
    action_text: `${m.sentTo} ${to}`,
  });

  revalidatePath(`/orders/${orderId}`);
  return { ok: true };
}
