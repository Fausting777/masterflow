'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function saveSignatureAction(formData: FormData): Promise<{
  ok: boolean;
  error?: string;
}> {
  const orderId = String(formData.get('order_id') ?? '');
  const file = formData.get('file') as File | null;

  if (!orderId) return { ok: false, error: 'Не указан заказ' };
  if (!file || file.size === 0) return { ok: false, error: 'Пустая подпись' };
  if (file.size > 2 * 1024 * 1024) return { ok: false, error: 'Файл слишком большой' };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Не авторизован' };

  // Проверяем заказ
  const { data: order } = await supabase
    .from('orders')
    .select('id, signature_file_path')
    .eq('id', orderId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!order) return { ok: false, error: 'Заказ не найден' };

  // Путь всегда один и тот же — перезаписываем предыдущую подпись
  const filePath = `${user.id}/${orderId}/signature.png`;

  const { error: uploadError } = await supabase.storage
    .from('order-signatures')
    .upload(filePath, file, {
      contentType: 'image/png',
      cacheControl: '3600',
      upsert: true, // перезаписать, если была
    });

  if (uploadError) {
    return { ok: false, error: `Ошибка загрузки: ${uploadError.message}` };
  }

  // Обновляем orders.signature_file_path
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
  const { data: { user } } = await supabase.auth.getUser();
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