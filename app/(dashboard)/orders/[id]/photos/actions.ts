'use server';

import { validateUploadedFile } from '@/lib/security/file-validation';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { PhotoType } from '@/types/database';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const PHOTO_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

export async function uploadPhotoAction(formData: FormData): Promise<{
  ok: boolean;
  error?: string;
}> {
  const orderId = String(formData.get('order_id') ?? '');
  const photoType = String(formData.get('photo_type') ?? '') as PhotoType;
  const file = formData.get('file') as File | null;

  if (!orderId) return { ok: false, error: 'Не указан заказ' };
  if (photoType !== 'before' && photoType !== 'after') {
    return { ok: false, error: 'Неверный тип фото' };
  }

  const validation = await validateUploadedFile(file, {
    allowedMimeTypes: PHOTO_MIME_TYPES,
    maxBytes: MAX_FILE_SIZE,
  });
  if (!validation.ok) {
    if (validation.error === 'missing') {
      return { ok: false, error: 'Файл не выбран' };
    }
    if (validation.error === 'too_large') {
      return { ok: false, error: 'Файл слишком большой (макс. 10 MB)' };
    }
    return { ok: false, error: 'Разрешены только JPEG, PNG и WebP' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Не авторизован' };

  const { data: order } = await supabase
    .from('orders')
    .select('id, invoice_number, invoice_locked_at')
    .eq('id', orderId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!order) return { ok: false, error: 'Заказ не найден' };
  if (order.invoice_number || order.invoice_locked_at) {
    return { ok: false, error: 'После выпуска счета нельзя менять фото, влияющие на архивный PDF' };
  }

  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${validation.extension}`;
  const filePath = `${user.id}/${orderId}/${photoType}/${filename}`;

  const { error: uploadError } = await supabase.storage
    .from('order-photos')
    .upload(filePath, file!, {
      contentType: validation.detectedMimeType,
      cacheControl: '3600',
      upsert: false,
    });

  if (uploadError) {
    return { ok: false, error: `Ошибка загрузки: ${uploadError.message}` };
  }

  const { error: dbError } = await supabase.from('order_photos').insert({
    order_id: orderId,
    user_id: user.id,
    photo_type: photoType,
    file_path: filePath,
  });

  if (dbError) {
    await supabase.storage.from('order-photos').remove([filePath]);
    return { ok: false, error: `Ошибка БД: ${dbError.message}` };
  }

  revalidatePath(`/orders/${orderId}`);
  return { ok: true };
}

export async function deletePhotoAction(photoId: string): Promise<{
  ok: boolean;
  error?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Не авторизован' };

  const { data: photo } = await supabase
    .from('order_photos')
    .select('file_path, order_id')
    .eq('id', photoId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!photo) return { ok: false, error: 'Фото не найдено' };

  await supabase.storage.from('order-photos').remove([photo.file_path]);

  const { error } = await supabase
    .from('order_photos')
    .delete()
    .eq('id', photoId)
    .eq('user_id', user.id);

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/orders/${photo.order_id}`);
  return { ok: true };
}
