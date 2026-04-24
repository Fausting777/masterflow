'use server';

import { revalidatePath } from 'next/cache';
import { getLocale } from '@/lib/i18n/server';
import { validateUploadedFile } from '@/lib/security/file-validation';
import { createClient } from '@/lib/supabase/server';
import type { PhotoType } from '@/types/database';

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const PHOTO_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

async function getMessages() {
  const locale = await getLocale();
  return locale === 'de'
    ? {
        missingOrder: 'Auftrag ist nicht angegeben',
        invalidType: 'Ungueltiger Fototyp',
        fileMissing: 'Datei wurde nicht ausgewaehlt',
        fileTooLarge: 'Datei ist zu gross (max. 10 MB)',
        invalidFileType: 'Nur JPEG, PNG und WebP sind erlaubt',
        unauthorized: 'Nicht autorisiert',
        orderNotFound: 'Auftrag nicht gefunden',
        locked: 'Nach der Quittungsausgabe koennen PDF-relevante Fotos nicht mehr geaendert werden',
        uploadError: 'Upload-Fehler',
        dbError: 'Datenbank-Fehler',
        photoNotFound: 'Foto nicht gefunden',
      }
    : {
        missingOrder: 'Не указан заказ',
        invalidType: 'Неверный тип фото',
        fileMissing: 'Файл не выбран',
        fileTooLarge: 'Файл слишком большой (макс. 10 MB)',
        invalidFileType: 'Разрешены только JPEG, PNG и WebP',
        unauthorized: 'Нет авторизации',
        orderNotFound: 'Заказ не найден',
        locked: 'После выдачи квитанции нельзя менять фото, влияющие на архивный PDF',
        uploadError: 'Ошибка загрузки',
        dbError: 'Ошибка БД',
        photoNotFound: 'Фото не найдено',
      };
}

export async function uploadPhotoAction(formData: FormData): Promise<{
  ok: boolean;
  error?: string;
}> {
  const m = await getMessages();
  const orderId = String(formData.get('order_id') ?? '');
  const photoType = String(formData.get('photo_type') ?? '') as PhotoType;
  const file = formData.get('file') as File | null;

  if (!orderId) return { ok: false, error: m.missingOrder };
  if (photoType !== 'before' && photoType !== 'after') {
    return { ok: false, error: m.invalidType };
  }

  const validation = await validateUploadedFile(file, {
    allowedMimeTypes: PHOTO_MIME_TYPES,
    maxBytes: MAX_FILE_SIZE,
  });
  if (!validation.ok) {
    if (validation.error === 'missing') return { ok: false, error: m.fileMissing };
    if (validation.error === 'too_large') return { ok: false, error: m.fileTooLarge };
    return { ok: false, error: m.invalidFileType };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: m.unauthorized };

  const { data: order } = await supabase
    .from('orders')
    .select('id, invoice_number, invoice_locked_at')
    .eq('id', orderId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!order) return { ok: false, error: m.orderNotFound };
  if (order.invoice_number || order.invoice_locked_at) return { ok: false, error: m.locked };

  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${validation.extension}`;
  const filePath = `${user.id}/${orderId}/${photoType}/${filename}`;

  const { error: uploadError } = await supabase.storage.from('order-photos').upload(filePath, file!, {
    contentType: validation.detectedMimeType,
    cacheControl: '3600',
    upsert: false,
  });

  if (uploadError) return { ok: false, error: `${m.uploadError}: ${uploadError.message}` };

  const { error: dbError } = await supabase.from('order_photos').insert({
    order_id: orderId,
    user_id: user.id,
    photo_type: photoType,
    file_path: filePath,
  });

  if (dbError) {
    await supabase.storage.from('order-photos').remove([filePath]);
    return { ok: false, error: `${m.dbError}: ${dbError.message}` };
  }

  revalidatePath(`/orders/${orderId}`);
  return { ok: true };
}

export async function deletePhotoAction(photoId: string): Promise<{
  ok: boolean;
  error?: string;
}> {
  const m = await getMessages();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: m.unauthorized };

  const { data: photo } = await supabase
    .from('order_photos')
    .select('file_path, order_id')
    .eq('id', photoId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!photo) return { ok: false, error: m.photoNotFound };

  const { error: storageError } = await supabase.storage.from('order-photos').remove([photo.file_path]);
  if (storageError) return { ok: false, error: `${m.uploadError}: ${storageError.message}` };

  const { error } = await supabase.from('order_photos').delete().eq('id', photoId).eq('user_id', user.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/orders/${photo.order_id}`);
  return { ok: true };
}
