'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import {
  validateOrder,
  normalizeOrderInput,
  type OrderValidationErrors,
} from '@/lib/validators/order';
import type { OrderStatus } from '@/types/database';

export type OrderFormState = {
  errors?: OrderValidationErrors;
  formError?: string;
  values?: {
    client_id: string;
    client_quick_name: string;        // ← новое
    client_quick_phone: string;     // ← новое
    service_id: string;
    custom_service_title: string;
    custom_price: string;
    description: string;
    order_address: string;
    scheduled_at: string;
    service_date: string;     // ← новое
    payment_method: string;      // ← новое
  };
};

function readFormData(formData: FormData): OrderFormState['values'] & object {
  return {
    client_id: String(formData.get('client_id') ?? ''),
    client_quick_name: String(formData.get('client_quick_name') ?? ''),   // ← новое
    client_quick_phone: String(formData.get('client_quick_phone') ?? ''),    // ← новое
    service_id: String(formData.get('service_id') ?? ''),
    custom_service_title: String(formData.get('custom_service_title') ?? ''),
    custom_price: String(formData.get('custom_price') ?? ''),
    description: String(formData.get('description') ?? ''),
    order_address: String(formData.get('order_address') ?? ''),
    scheduled_at: String(formData.get('scheduled_at') ?? ''),
    service_date: String(formData.get('service_date') ?? ''),   // ← новое
     payment_method: String(formData.get('payment_method') ?? ''),   // ← новое
  };
}

export async function createOrderAction(
  _prevState: OrderFormState,
  formData: FormData
): Promise<OrderFormState> {
  const raw = readFormData(formData);

  const errors = validateOrder(raw);
  if (Object.keys(errors).length > 0) return { errors, values: raw };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { formError: 'Не авторизован', values: raw };

  const normalized = normalizeOrderInput(raw);

  // Ветка 1: есть client_id — обычное создание
  if (normalized.client_id) {
    const { data, error } = await supabase
      .from('orders')
      .insert({
        user_id: user.id,
        status: 'new',
        client_id: normalized.client_id,
        service_id: normalized.service_id,
        custom_service_title: normalized.custom_service_title,
        custom_price: normalized.custom_price,
        description: normalized.description,
        order_address: normalized.order_address,
        scheduled_at: normalized.scheduled_at,
        service_date: normalized.service_date,     // ← новое
        payment_method: normalized.payment_method,     // ← новое
      })
      .select('id')
      .single();

    if (error) return { formError: `Ошибка: ${error.message}`, values: raw };

    revalidatePath('/orders');
    redirect(`/orders/${data.id}`);
  }

  // Ветка 2: быстрое имя — создаём клиента и заказ за одну транзакцию
  if (!normalized.client_quick_name) {
    return { formError: 'Укажите клиента', values: raw };
  }

  const { data, error } = await supabase.rpc('create_order_with_new_client', {
    p_full_name: normalized.client_quick_name,
    p_phone: normalized.client_quick_phone,            // ← новое
    p_service_id: normalized.service_id,
    p_custom_service_title: normalized.custom_service_title,
    p_custom_price: normalized.custom_price,
    p_description: normalized.description,
    p_order_address: normalized.order_address,
    p_scheduled_at: normalized.scheduled_at,
   p_service_date: normalized.service_date,   // ← было null, стало из формы
   p_payment_method: normalized.payment_method,    // ← новое
  });

  if (error) {
    return { formError: `Ошибка создания: ${error.message}`, values: raw };
  }

  // RPC возвращает массив строк — берём первую
  const orderId = Array.isArray(data) && data[0]?.order_id
    ? data[0].order_id
    : null;

  if (!orderId) {
    return { formError: 'Не удалось создать заказ', values: raw };
  }

  revalidatePath('/orders');
  revalidatePath('/clients');
  redirect(`/orders/${orderId}`);
}
export async function updateOrderAction(
  id: string,
  _prevState: OrderFormState,
  formData: FormData
): Promise<OrderFormState> {
  const raw = readFormData(formData);

  // При редактировании поле client_quick_name не применимо
  // Валидируем только с реальным client_id
  const errors = validateOrder(raw);

  // Убираем ошибку про quick_name (она не имеет значения при редактировании)
  delete errors.client_quick_name;

  // Но теперь требуем чтобы client_id был заполнен
  if (!raw.client_id.trim()) {
    errors.client_id = 'Выберите клиента';
  }

  if (Object.keys(errors).length > 0) return { errors, values: raw };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { formError: 'Не авторизован', values: raw };

  const normalized = normalizeOrderInput(raw);

  // Убираем client_quick_name — его нет в таблице orders
  const { client_quick_name, ...updateData } = normalized;
  void client_quick_name;

  // Дополнительная страховка — не даём затереть client_id
  if (!updateData.client_id) {
    return {
      formError: 'Не удалось определить клиента',
      values: raw,
    };
  }

  const { error } = await supabase
    .from('orders')
    .update(updateData)
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) return { formError: `Ошибка: ${error.message}`, values: raw };

  revalidatePath('/orders');
  revalidatePath(`/orders/${id}`);
  redirect(`/orders/${id}`);
}

export async function changeOrderStatusAction(
  id: string,
  status: OrderStatus
): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Не авторизован');

  // При переводе в "completed" — если service_date ещё пусто, ставим сегодня
  const updates: Record<string, unknown> = { status };

  if (status === 'completed') {
    const { data: current } = await supabase
      .from('orders')
      .select('service_date')
      .eq('id', id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (current && !current.service_date) {
      updates.service_date = new Date().toISOString();
    }
  }

  const { error } = await supabase
    .from('orders')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) throw new Error(error.message);

  revalidatePath('/orders');
  revalidatePath(`/orders/${id}`);
}

// Мягкое удаление (в корзину)
export async function softDeleteOrderAction(id: string): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Не авторизован');

  const { error } = await supabase
    .from('orders')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) throw new Error(error.message);

  // Логируем в activity_logs (тот же user, та же таблица логов)
  await supabase.from('activity_logs').insert({
    order_id: id,
    user_id: user.id,
    action_type: 'soft_deleted',
    action_text: 'Перемещён в корзину',
  });

  revalidatePath('/orders');
  revalidatePath('/orders/trash');
  redirect('/orders');
}

// Восстановление из корзины
export async function restoreOrderAction(id: string): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Не авторизован');

  const { error } = await supabase
    .from('orders')
    .update({ deleted_at: null })
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) throw new Error(error.message);

  await supabase.from('activity_logs').insert({
    order_id: id,
    user_id: user.id,
    action_type: 'restored',
    action_text: 'Восстановлен из корзины',
  });

  revalidatePath('/orders');
  revalidatePath('/orders/trash');
  revalidatePath(`/orders/${id}`);
  redirect(`/orders/${id}`);
}

// Окончательное удаление (только для заказов БЕЗ invoice_number)
export async function permanentDeleteOrderAction(id: string): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Не авторизован');

  // Критическая проверка: нельзя удалять заказ со счётом
  const { data: order } = await supabase
    .from('orders')
    .select('invoice_number, deleted_at')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!order) throw new Error('Заказ не найден');
  if (order.invoice_number) {
    throw new Error('Нельзя удалить: по заказу выставлен счёт (§14 UStG требует 10 лет хранения)');
  }
  if (!order.deleted_at) {
    throw new Error('Сначала переместите в корзину');
  }

  // Удаляем связанные файлы из Storage
  // 1. Фото
  const { data: photos } = await supabase
    .from('order_photos')
    .select('file_path')
    .eq('order_id', id);
  
  if (photos && photos.length > 0) {
    await supabase.storage
      .from('order-photos')
      .remove(photos.map(p => p.file_path));
  }

  // 2. Подпись — получаем из заказа заново (теперь уже точно без invoice)
  const { data: fullOrder } = await supabase
    .from('orders')
    .select('signature_file_path, pdf_file_path')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (fullOrder?.signature_file_path) {
    await supabase.storage.from('order-signatures').remove([fullOrder.signature_file_path]);
  }
  if (fullOrder?.pdf_file_path) {
    await supabase.storage.from('order-pdfs').remove([fullOrder.pdf_file_path]);
  }

  // 3. Удаляем заказ — activity_logs и order_photos удалятся каскадом (cascade в FK)
  const { error } = await supabase
    .from('orders')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) throw new Error(error.message);

  revalidatePath('/orders');
  revalidatePath('/orders/trash');
  redirect('/orders/trash');
}