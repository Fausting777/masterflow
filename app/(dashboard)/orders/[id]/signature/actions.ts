'use server';

import { revalidatePath } from 'next/cache';
import { getLocale } from '@/lib/i18n/server';
import { validateUploadedFile } from '@/lib/security/file-validation';
import { createClient } from '@/lib/supabase/server';

const MAX_SIGNATURE_SIZE = 2 * 1024 * 1024;
const SIGNATURE_MIME_TYPES = ['image/png'] as const;

async function getMessages() {
  const locale = await getLocale();
  return locale === 'de'
    ? {
        missingOrder: 'Auftrag ist nicht angegeben',
        emptySignature: 'Leere Unterschrift',
        fileTooLarge: 'Datei ist zu gross',
        invalidType: 'Die Unterschrift muss eine PNG-Datei sein',
        unauthorized: 'Nicht autorisiert',
        orderNotFound: 'Auftrag nicht gefunden',
        locked: 'Nach der Rechnungsausstellung darf die Unterschrift des Archivdokuments nicht mehr geaendert werden',
        uploadError: 'Upload-Fehler',
      }
    : {
        missingOrder: 'Не указан заказ',
        emptySignature: 'Пустая подпись',
        fileTooLarge: 'Файл слишком большой',
        invalidType: 'Подпись должна быть PNG-файлом',
        unauthorized: 'Нет авторизации',
        orderNotFound: 'Заказ не найден',
        locked: 'После выставления счёта нельзя менять подпись архивного документа',
        uploadError: 'Ошибка загрузки',
      };
}

export async function saveSignatureAction(formData: FormData): Promise<{
  ok: boolean;
  error?: string;
}> {
  const m = await getMessages();
  const orderId = String(formData.get('order_id') ?? '');
  const file = formData.get('file') as File | null;

  if (!orderId) return { ok: false, error: m.missingOrder };

  const validation = await validateUploadedFile(file, {
    allowedMimeTypes: SIGNATURE_MIME_TYPES,
    maxBytes: MAX_SIGNATURE_SIZE,
  });
  if (!validation.ok) {
    if (validation.error === 'missing') return { ok: false, error: m.emptySignature };
    if (validation.error === 'too_large') return { ok: false, error: m.fileTooLarge };
    return { ok: false, error: m.invalidType };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: m.unauthorized };

  const { data: order } = await supabase
    .from('orders')
    .select('id, signature_file_path, invoice_number, invoice_locked_at')
    .eq('id', orderId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!order) return { ok: false, error: m.orderNotFound };
  if (order.invoice_number || order.invoice_locked_at) return { ok: false, error: m.locked };

  if (order.signature_file_path) {
    await supabase.storage.from('order-signatures').remove([order.signature_file_path]);
  }

  const rand = crypto.randomUUID().slice(0, 8);
  const filePath = `${user.id}/${orderId}/signature-${rand}.png`;
  const { error: uploadError } = await supabase.storage.from('order-signatures').upload(filePath, file!, {
    contentType: validation.detectedMimeType,
    cacheControl: '3600',
  });

  if (uploadError) return { ok: false, error: `${m.uploadError}: ${uploadError.message}` };

  const { error: updateError } = await supabase
    .from('orders')
    .update({ signature_file_path: filePath })
    .eq('id', orderId)
    .eq('user_id', user.id);

  if (updateError) return { ok: false, error: updateError.message };

  revalidatePath(`/orders/${orderId}`);
  return { ok: true };
}

export async function deleteSignatureAction(orderId: string): Promise<{
  ok: boolean;
  error?: string;
}> {
  const m = await getMessages();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: m.unauthorized };

  const { data: order } = await supabase
    .from('orders')
    .select('signature_file_path')
    .eq('id', orderId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!order) return { ok: false, error: m.orderNotFound };

  if (order.signature_file_path) {
    const { error: storageError } = await supabase.storage.from('order-signatures').remove([order.signature_file_path]);
    if (storageError) return { ok: false, error: `${m.uploadError}: ${storageError.message}` };
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
