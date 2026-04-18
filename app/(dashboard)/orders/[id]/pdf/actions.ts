'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { generateInvoicePdf, type InvoiceData } from '@/lib/pdf/invoice';

// Скачивает файл из Storage как Uint8Array
async function downloadFile(
  supabase: Awaited<ReturnType<typeof createClient>>,
  bucket: string,
  path: string
): Promise<Uint8Array | null> {
  const { data, error } = await supabase.storage.from(bucket).download(path);
  if (error || !data) return null;
  const arrBuf = await data.arrayBuffer();
  return new Uint8Array(arrBuf);
}

export async function generatePdfAction(orderId: string): Promise<{
  ok: boolean;
  error?: string;
}> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Не авторизован' };

  // 1. Заказ
  const { data: order } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .eq('user_id', user.id)
    .maybeSingle();
  if (!order) return { ok: false, error: 'Заказ не найден' };

  // 2. Профиль мастера
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  // 3. Клиент
  const { data: client } = await supabase
    .from('clients')
    .select('*')
    .eq('id', order.client_id)
    .maybeSingle();
  if (!client) return { ok: false, error: 'Клиент не найден' };

  // 4. Услуга (если из каталога)
  let serviceTitle = order.custom_service_title ?? 'Услуга';
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

  // 5. Фото
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

  // 6. Подпись
  let signature: Uint8Array | null = null;
  if (order.signature_file_path) {
    signature = await downloadFile(supabase, 'order-signatures', order.signature_file_path);
  }

  // 7. Собираем данные
  const invoiceData: InvoiceData = {
    master: {
      full_name: profile?.full_name ?? null,
      phone: profile?.phone ?? null,
      company_name: profile?.company_name ?? null,
      email: profile?.email ?? user.email ?? null,
    },
    client: {
      full_name: client.full_name,
      phone: client.phone,
      address: client.address,
    },
    order: {
      id: order.id,
      service_title: serviceTitle,
      price: servicePrice,
      description: order.description,
      order_address: order.order_address,
      created_at: order.created_at,
      completed_at: order.completed_at,
    },
    signature,
    photosBefore: beforePhotos,
    photosAfter: afterPhotos,
  };

  // 8. Генерируем PDF
  let pdfBytes: Uint8Array;
  try {
    pdfBytes = await generateInvoicePdf(invoiceData);
  } catch (e) {
    return {
      ok: false,
      error: `Ошибка генерации: ${e instanceof Error ? e.message : 'неизвестно'}`,
    };
  }

  // 9. Сохраняем в Storage (перезаписываем, если уже был)
  const filePath = `${user.id}/${orderId}/invoice.pdf`;
  // Создаём Blob для uploader'а
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });

  const { error: uploadError } = await supabase.storage
    .from('order-pdfs')
    .upload(filePath, blob, {
      contentType: 'application/pdf',
      cacheControl: '3600',
      upsert: true,
    });

  if (uploadError) {
    return { ok: false, error: `Ошибка загрузки: ${uploadError.message}` };
  }

  // 10. Обновляем orders.pdf_file_path
  await supabase
    .from('orders')
    .update({ pdf_file_path: filePath })
    .eq('id', orderId)
    .eq('user_id', user.id);

  revalidatePath(`/orders/${orderId}`);
  return { ok: true };
}

// Получение signed URL для просмотра/скачивания
export async function getPdfSignedUrlAction(orderId: string): Promise<{
  url: string | null;
  error?: string;
}> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { url: null, error: 'Не авторизован' };

  const { data: order } = await supabase
    .from('orders')
    .select('pdf_file_path')
    .eq('id', orderId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!order?.pdf_file_path) return { url: null, error: 'PDF не создан' };

  const { data, error } = await supabase.storage
    .from('order-pdfs')
    .createSignedUrl(order.pdf_file_path, 300); // 5 минут хватит

  if (error || !data) return { url: null, error: error?.message ?? 'Ошибка' };
  return { url: data.signedUrl };
}