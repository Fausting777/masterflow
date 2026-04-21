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
        missingOrder: '\u0417\u0430\u043a\u0430\u0437 \u043d\u0435 \u0443\u043a\u0430\u0437\u0430\u043d',
        invalidRecipient:
          '\u041d\u0435\u043a\u043e\u0440\u0440\u0435\u043a\u0442\u043d\u044b\u0439 email \u043f\u043e\u043b\u0443\u0447\u0430\u0442\u0435\u043b\u044f',
        emptySubject: '\u0422\u0435\u043c\u0430 \u043f\u0443\u0441\u0442\u0430',
        emptyBody: '\u0422\u0435\u043a\u0441\u0442 \u043f\u0443\u0441\u0442',
        unauthorized: '\u041d\u0435\u0442 \u0430\u0432\u0442\u043e\u0440\u0438\u0437\u0430\u0446\u0438\u0438',
        orderNotFound: '\u0417\u0430\u043a\u0430\u0437 \u043d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d',
        pdfMissing:
          'PDF \u0435\u0449\u0435 \u043d\u0435 \u0441\u043e\u0437\u0434\u0430\u043d, \u0441\u043d\u0430\u0447\u0430\u043b\u0430 \u0441\u0433\u0435\u043d\u0435\u0440\u0438\u0440\u0443\u0439\u0442\u0435 \u0441\u0447\u0435\u0442',
        pdfDownloadFailed:
          '\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044c PDF',
        sendUnknown:
          '\u041d\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043d\u0430\u044f \u043e\u0448\u0438\u0431\u043a\u0430 \u043e\u0442\u043f\u0440\u0430\u0432\u043a\u0438',
        sentTo: '\u0421\u0447\u0435\u0442 \u043e\u0442\u043f\u0440\u0430\u0432\u043b\u0435\u043d \u043d\u0430',
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
  const filename = order.invoice_number
    ? `Rechnung-${order.invoice_number}.pdf`
    : `Rechnung-${order.id.slice(0, 8)}.pdf`;
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
