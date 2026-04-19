'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { generateInvoicePdf, type InvoiceData } from '@/lib/pdf/invoice';

async function downloadFile(
  supabase: Awaited<ReturnType<typeof createClient>>,
  bucket: string,
  path: string
): Promise<Uint8Array | null> {
  const { data, error } = await supabase.storage.from(bucket).download(path);
  if (error || !data) return null;
  return new Uint8Array(await data.arrayBuffer());
}

export async function generatePdfAction(orderId: string): Promise<{
  ok: boolean;
  error?: string;
}> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Не авторизован' };

  const { data: order } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .eq('user_id', user.id)
    .maybeSingle();
  if (!order) return { ok: false, error: 'Заказ не найден' };

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  // Проверки обязательных полей
  const missing: string[] = [];
  if (!profile?.full_name && !profile?.company_name) missing.push('имя или компания');
  if (!profile?.address) missing.push('адрес');
  if (!profile?.postal_code) missing.push('PLZ');
  if (!profile?.city) missing.push('город');
  if (!profile?.tax_number) missing.push('Steuernummer');
  if (missing.length > 0) {
    return {
      ok: false,
      error: `Заполните в Настройках: ${missing.join(', ')}`,
    };
  }

  const { data: client } = await supabase
    .from('clients')
    .select('*')
    .eq('id', order.client_id)
    .maybeSingle();
  if (!client) return { ok: false, error: 'Клиент не найден' };

  // Услуга и цена
  let serviceTitle = order.custom_service_title ?? 'Leistung';
  let servicePrice = order.custom_price;
  if (order.service_id) {
    const { data: service } = await supabase
      .from('services')
      .select('*')
      .eq('id', order.service_id)
      .maybeSingle();
    if (service) {
      serviceTitle = service.title;
      if (servicePrice === null) servicePrice = service.default_price;
    }
  }

  if (servicePrice === null) {
    return { ok: false, error: 'Не указана цена заказа' };
  }

  // ====== ВЫДАЧА НОМЕРА СЧЁТА ======
  // Если номер уже есть — используем его (GoBD: номер неизменен).
  // Если нет — получаем новый через атомарную функцию.
  let invoiceNumber = order.invoice_number as string | null;
  let invoiceIssuedAt = order.invoice_issued_at as string | null;

  if (!invoiceNumber) {
    const year = new Date().getFullYear();
    const { data: numberData, error: numberError } = await supabase.rpc(
      'next_invoice_number',
      { p_user_id: user.id, p_year: year }
    );

    if (numberError || numberData === null) {
      return { ok: false, error: `Не удалось получить номер: ${numberError?.message ?? 'error'}` };
    }

    invoiceNumber = `${year}-${String(numberData).padStart(4, '0')}`;
    invoiceIssuedAt = new Date().toISOString();

    // Записываем на заказ
    await supabase
      .from('orders')
      .update({
        invoice_number: invoiceNumber,
        invoice_issued_at: invoiceIssuedAt,
      })
      .eq('id', orderId)
      .eq('user_id', user.id);
  }

  // Leistungsdatum: если задан service_date — его, иначе completed_at, иначе created_at
  const serviceDate = order.service_date ?? order.completed_at ?? order.created_at;

  // Фото
  const { data: photos } = await supabase
    .from('order_photos')
    .select('*')
    .eq('order_id', orderId)
    .order('created_at', { ascending: true });

  const beforePhotos: Uint8Array[] = [];
  const afterPhotos: Uint8Array[] = [];
  for (const p of photos ?? []) {
    const bytes = await downloadFile(supabase, 'order-photos', p.file_path);
    if (!bytes) continue;
    if (p.photo_type === 'before') beforePhotos.push(bytes);
    else afterPhotos.push(bytes);
  }

  // Подпись
  let signature: Uint8Array | null = null;
  if (order.signature_file_path) {
    signature = await downloadFile(supabase, 'order-signatures', order.signature_file_path);
  }

  const invoiceData: InvoiceData = {
    master: {
      full_name: profile.full_name,
      phone: profile.phone,
      email: profile.business_email ?? profile.email ?? user.email ?? null,
      company_name: profile.company_name,
      address: profile.address,
      postal_code: profile.postal_code,
      city: profile.city,
      tax_number: profile.tax_number,
      vat_id: profile.vat_id,
      is_kleinunternehmer: profile.is_kleinunternehmer ?? true,
      iban: profile.iban,
      bank_name: profile.bank_name,
    },
    client: {
  full_name: client.full_name,
  phone: client.phone,
  address: [
    client.address,
    [client.postal_code, client.city].filter(Boolean).join(' '),
  ]
    .filter(Boolean)
    .join(', '),
},
    order: {
      id: order.id,
      invoice_number: invoiceNumber,
      invoice_date: invoiceIssuedAt!,
      service_date: serviceDate,
      service_title: serviceTitle,
      price: servicePrice,
      description: order.description,
      order_address: order.order_address,
      payment_method: order.payment_method,     // ← новое
    },
    signature,
    photosBefore: beforePhotos,
    photosAfter: afterPhotos,
  };

  let pdfBytes: Uint8Array;
  try {
    pdfBytes = await generateInvoicePdf(invoiceData);
  } catch (e) {
    return {
      ok: false,
      error: `Ошибка генерации: ${e instanceof Error ? e.message : 'неизвестно'}`,
    };
  }

  const filePath = `${user.id}/${orderId}/invoice.pdf`;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });

  const { error: uploadError } = await supabase.storage
    .from('order-pdfs')
    .upload(filePath, blob, {
      contentType: 'application/pdf',
      cacheControl: '3600',
      upsert: true,
    });

  if (uploadError) return { ok: false, error: uploadError.message };

  await supabase
    .from('orders')
    .update({ pdf_file_path: filePath })
    .eq('id', orderId)
    .eq('user_id', user.id);

  revalidatePath(`/orders/${orderId}`);
  return { ok: true };
}

export async function getPdfSignedUrlAction(orderId: string): Promise<{
  url: string | null;
  error?: string;
}> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { url: null, error: 'Не авторизован' };

  const { data: order } = await supabase
    .from('orders')
    .select('pdf_file_path, invoice_number')
    .eq('id', orderId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!order?.pdf_file_path) return { url: null, error: 'PDF не создан' };

  const filename = order.invoice_number
    ? `Rechnung-${order.invoice_number}.pdf`
    : `Rechnung-${orderId.slice(0, 8)}.pdf`;

  const { data, error } = await supabase.storage
    .from('order-pdfs')
    .createSignedUrl(order.pdf_file_path, 300, {
      download: filename,
    });

  if (error || !data) return { url: null, error: error?.message ?? 'Ошибка' };
  return { url: data.signedUrl };
}