'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { getResendClient } from '@/lib/email/resend';

type SendInput = {
  orderId: string;
  to: string;
  subject: string;
  body: string;
};

export async function sendInvoiceEmailAction(input: SendInput): Promise<{
  ok: boolean;
  error?: string;
}> {
  const { orderId, to, subject, body } = input;

  if (!orderId) return { ok: false, error: 'Не указан заказ' };
  if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    return { ok: false, error: 'Некорректный email получателя' };
  }
  if (!subject.trim()) return { ok: false, error: 'Тема пуста' };
  if (!body.trim()) return { ok: false, error: 'Текст пуст' };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Не авторизован' };

  // Заказ и PDF
  const { data: order } = await supabase
    .from('orders')
    .select('id, user_id, pdf_file_path, invoice_number')
    .eq('id', orderId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!order) return { ok: false, error: 'Заказ не найден' };
  if (!order.pdf_file_path) {
    return { ok: false, error: 'PDF не создан — сначала сгенерируй счёт' };
  }

  // Профиль мастера для from-имени
  const { data: profile } = await supabase
  .from('profiles')
  .select('full_name, company_name, business_email')
  .eq('id', user.id)
  .maybeSingle();

  // Скачиваем PDF
  const { data: pdfBlob, error: dlError } = await supabase.storage
    .from('order-pdfs')
    .download(order.pdf_file_path);

  if (dlError || !pdfBlob) {
    return {
      ok: false,
      error: `Не удалось загрузить PDF: ${dlError?.message ?? 'error'}`,
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
      attachments: [
        {
          filename,
          content: pdfBuffer,
        },
      ],
    });

    if (error) {
      return { ok: false, error: `Resend: ${error.message}` };
    }
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Неизвестная ошибка отправки',
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
    action_text: `Счёт отправлен на ${to}`,
  });

  revalidatePath(`/orders/${orderId}`);

  return { ok: true };
}