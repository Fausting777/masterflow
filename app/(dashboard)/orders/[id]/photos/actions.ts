'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { PhotoType } from '@/types/database';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic'];

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
  if (!file || file.size === 0) return { ok: false, error: 'Файл не выбран' };
  if (file.size > MAX_FILE_SIZE) return { ok: false, error: 'Файл слишком большой (макс. 10 MB)' };
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { ok: false, error: 'Разрешены только изображения' };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Не авторизован' };

  // Проверка, что заказ принадлежит пользователю (страховка поверх RLS)
  const { data: order } = await supabase
    .from('orders')
    .select('id')
    .eq('id', orderId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!order) return { ok: false, error: 'Заказ не найден' };

  // Формируем путь: {user_id}/{order_id}/{before|after}/{timestamp}-{name}.ext
  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const filePath = `${user.id}/${orderId}/${photoType}/${filename}`;

  // Загружаем в Storage
  const { error: uploadError } = await supabase.storage
    .from('order-photos')
    .upload(filePath, file, {
      contentType: file.type,
      cacheControl: '3600',
      upsert: false,
    });

  if (uploadError) {
    return { ok: false, error: `Ошибка загрузки: ${uploadError.message}` };
  }

  // Сохраняем запись в БД
  const { error: dbError } = await supabase.from('order_photos').insert({
    order_id: orderId,
    user_id: user.id,
    photo_type: photoType,
    file_path: filePath,
  });

  if (dbError) {
    // Откатываем: удаляем загруженный файл
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
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Не авторизован' };

  // Получаем file_path и order_id для удаления
  const { data: photo } = await supabase
    .from('order_photos')
    .select('file_path, order_id')
    .eq('id', photoId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!photo) return { ok: false, error: 'Фото не найдено' };

  // Удаляем файл из Storage
  await supabase.storage.from('order-photos').remove([photo.file_path]);

  // Удаляем запись из БД
  const { error } = await supabase
    .from('order_photos')
    .delete()
    .eq('id', photoId)
    .eq('user_id', user.id);

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/orders/${photo.order_id}`);
  return { ok: true };
}