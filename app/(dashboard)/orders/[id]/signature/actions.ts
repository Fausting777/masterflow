'use server';

import { validateUploadedFile } from '@/lib/security/file-validation';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

const MAX_SIGNATURE_SIZE = 2 * 1024 * 1024;
const SIGNATURE_MIME_TYPES = ['image/png'] as const;

export async function saveSignatureAction(formData: FormData): Promise<{
  ok: boolean;
  error?: string;
}> {
  const orderId = String(formData.get('order_id') ?? '');
  const file = formData.get('file') as File | null;

  if (!orderId) return { ok: false, error: 'Не указан заказ' };

  const validation = await validateUploadedFile(file, {
    allowedMimeTypes: SIGNATURE_MIME_TYPES,
    maxBytes: MAX_SIGNATURE_SIZE,
  });
  if (!validation.ok) {
    if (validation.error === 'missing') {
      return { ok: false, error: 'Пустая подпись' };
    }
    if (validation.error === 'too_large') {
      return { ok: false, error: 'Файл слишком большой' };
    }
    return { ok: false, error: 'Подпись должна быть PNG-файлом' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Не авторизован' };

  const { data: order } = await supabase
    .from('orders')
    .select('id, signature_file_path, invoice_number, invoice_locked_at')
    .eq('id', orderId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!order) return { ok: false, error: 'Заказ не найден' };
  if (order.invoice_number || order.invoice_locked_at) {
    return { ok: false, error: 'После выпуска счета нельзя менять подпись архивного документа' };
  }

  const filePath = `${user.id}/${orderId}/signature.png`;

  const { error: uploadError } = await supabase.storage
    .from('order-signatures')
    .upload(filePath, file!, {
      contentType: validation.detectedMimeType,
      cacheControl: '3600',
      upsert: true,
    });

  if (uploadError) {
    return { ok: false, error: `Ошибка загрузки: ${uploadError.message}` };
  }

  const { error: updateError } = await supabase
    .from('orders')
    .update({ signature_file_path: filePath })
    .eq('id', orderId)
    .eq('user_id', user.id);

  if (updateError) {
    return { ok: false, error: updateError.message };
  }

  revalidatePath(`/orders/${orderId}`);
  return { ok: true };
}

export async function deleteSignatureAction(orderId: string): Promise<{
  ok: boolean;
  error?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Не авторизован' };

  const { data: order } = await supabase
    .from('orders')
    .select('signature_file_path')
    .eq('id', orderId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!order) return { ok: false, error: 'Заказ не найден' };

  if (order.signature_file_path) {
    await supabase.storage.from('order-signatures').remove([order.signature_file_path]);
  }

  const { error } = await supabase
    .from('orders')
    .update({ signature_file_path: null })
    .eq('id', orderId)
    .eq('user_id', user.id);

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/orders/${orderId}`);
  return { ok: true };
}
