'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import {
  normalizeOrderInput,
  validateOrder,
  type OrderValidationErrors,
} from '@/lib/validators/order';
import type { OrderStatus } from '@/types/database';

export type OrderFormState = {
  errors?: OrderValidationErrors;
  formError?: string;
  values?: {
    client_id: string;
    client_quick_name: string;
    client_quick_phone: string;
    client_quick_address: string;
    client_quick_postal_code: string;
    client_quick_city: string;
    correction_reason: string;
    service_id: string;
    custom_service_title: string;
    custom_price: string;
    description: string;
    order_address: string;
    scheduled_at: string;
    service_date: string;
    payment_method: string;
  };
};

function readFormData(formData: FormData): OrderFormState['values'] & object {
  return {
    client_id: String(formData.get('client_id') ?? ''),
    client_quick_name: String(formData.get('client_quick_name') ?? ''),
    client_quick_phone: String(formData.get('client_quick_phone') ?? ''),
    client_quick_address: String(formData.get('client_quick_address') ?? ''),
    client_quick_postal_code: String(formData.get('client_quick_postal_code') ?? ''),
    client_quick_city: String(formData.get('client_quick_city') ?? ''),
    correction_reason: String(formData.get('correction_reason') ?? ''),
    service_id: String(formData.get('service_id') ?? ''),
    custom_service_title: String(formData.get('custom_service_title') ?? ''),
    custom_price: String(formData.get('custom_price') ?? ''),
    description: String(formData.get('description') ?? ''),
    order_address: String(formData.get('order_address') ?? ''),
    scheduled_at: String(formData.get('scheduled_at') ?? ''),
    service_date: String(formData.get('service_date') ?? ''),
    payment_method: String(formData.get('payment_method') ?? ''),
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
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { formError: 'Не авторизован', values: raw };

  const normalized = normalizeOrderInput(raw);

  if (normalized.client_id) {
    const { data, error } = await supabase
      .from('orders')
      .insert({
        user_id: user.id,
        correction_of_order_id: null,
        correction_reason: normalized.correction_reason,
        status: 'new',
        client_id: normalized.client_id,
        service_id: normalized.service_id,
        custom_service_title: normalized.custom_service_title,
        custom_price: normalized.custom_price,
        description: normalized.description,
        order_address: normalized.order_address,
        scheduled_at: normalized.scheduled_at,
        service_date: normalized.service_date,
        payment_method: normalized.payment_method,
      })
      .select('id')
      .single();

    if (error) return { formError: `Ошибка: ${error.message}`, values: raw };

    revalidatePath('/orders');
    redirect(`/orders/${data.id}`);
  }

  if (!normalized.client_quick_name) {
    return { formError: 'Укажите клиента', values: raw };
  }

  const { data: client, error: clientError } = await supabase
    .from('clients')
    .insert({
      user_id: user.id,
      full_name: normalized.client_quick_name,
      phone: normalized.client_quick_phone,
      address: normalized.client_quick_address,
      postal_code: normalized.client_quick_postal_code,
      city: normalized.client_quick_city,
    })
    .select('id')
    .single();

  if (clientError || !client) {
    return { formError: `Ошибка создания клиента: ${clientError?.message ?? 'unknown error'}`, values: raw };
  }

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      user_id: user.id,
      correction_of_order_id: null,
      correction_reason: normalized.correction_reason,
      status: 'new',
      client_id: client.id,
      service_id: normalized.service_id,
      custom_service_title: normalized.custom_service_title,
      custom_price: normalized.custom_price,
      description: normalized.description,
      order_address: normalized.order_address ?? normalized.client_quick_address,
      scheduled_at: normalized.scheduled_at,
      service_date: normalized.service_date,
      payment_method: normalized.payment_method,
    })
    .select('id')
    .single();

  if (orderError || !order) {
    return { formError: `Ошибка создания заказа: ${orderError?.message ?? 'unknown error'}`, values: raw };
  }

  revalidatePath('/orders');
  revalidatePath('/clients');
  redirect(`/orders/${order.id}`);
}

export async function updateOrderAction(
  id: string,
  _prevState: OrderFormState,
  formData: FormData
): Promise<OrderFormState> {
  const raw = readFormData(formData);
  const errors = validateOrder(raw);
  delete errors.client_quick_name;
  delete errors.client_quick_phone;
  delete errors.client_quick_address;
  delete errors.client_quick_postal_code;
  delete errors.client_quick_city;

  if (!raw.client_id.trim()) {
    errors.client_id = 'Выберите клиента';
  }

  if (Object.keys(errors).length > 0) return { errors, values: raw };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { formError: 'Не авторизован', values: raw };

  const { data: currentOrder } = await supabase
    .from('orders')
    .select('id, invoice_number, invoice_locked_at, correction_of_order_id')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!currentOrder) {
    return { formError: 'Заказ не найден', values: raw };
  }

  if (currentOrder.invoice_number || currentOrder.invoice_locked_at) {
    await supabase.from('activity_logs').insert({
      order_id: id,
      user_id: user.id,
      action_type: 'invoice_edit_blocked',
      action_text: 'Попытка изменить заказ после выпуска счета была заблокирована',
    });

    return {
      formError:
        'Этот заказ уже зафиксирован счетом. Изменение исходных данных заблокировано. Для исправления нужен отдельный документ-коррекция.',
      values: raw,
    };
  }

  const normalized = normalizeOrderInput(raw);
  const {
    client_quick_name,
    client_quick_phone,
    client_quick_address,
    client_quick_postal_code,
    client_quick_city,
    ...updateData
  } = normalized;
  void client_quick_name;
  void client_quick_phone;
  void client_quick_address;
  void client_quick_postal_code;
  void client_quick_city;

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

  await supabase.from('activity_logs').insert({
    order_id: id,
    user_id: user.id,
    action_type: 'order_updated',
    action_text: 'Данные заказа обновлены до выпуска счета',
  });

  revalidatePath('/orders');
  revalidatePath(`/orders/${id}`);
  redirect(`/orders/${id}`);
}

export async function changeOrderStatusAction(
  id: string,
  status: OrderStatus
): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Не авторизован');

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

export async function createCorrectionDraftAction(orderId: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Не авторизован');

  const { data: sourceOrder } = await supabase
    .from('orders')
    .select(
      'id, user_id, correction_of_order_id, client_id, service_id, custom_service_title, custom_price, description, order_address, scheduled_at, service_date, payment_method, invoice_number, invoice_snapshot_json'
    )
    .eq('id', orderId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!sourceOrder) throw new Error('Исходный заказ не найден');
  if (!sourceOrder.invoice_number) {
    throw new Error('Корректировку можно создавать только для уже выпущенного счета');
  }
  if (sourceOrder.correction_of_order_id) {
    throw new Error('Нельзя создавать корректировку поверх другой корректировки');
  }

  const snapshot =
    sourceOrder.invoice_snapshot_json && typeof sourceOrder.invoice_snapshot_json === 'object'
      ? (sourceOrder.invoice_snapshot_json as { order?: Record<string, unknown> })
      : null;

  const { data: created, error } = await supabase
    .from('orders')
    .insert({
      user_id: user.id,
      correction_of_order_id: sourceOrder.id,
      correction_reason: `Korrektur zu Rechnung ${sourceOrder.invoice_number}`,
      status: 'new',
      client_id: sourceOrder.client_id,
      service_id: sourceOrder.service_id,
      custom_service_title:
        typeof snapshot?.order?.service_title === 'string'
          ? snapshot.order.service_title
          : sourceOrder.custom_service_title,
      custom_price:
        typeof snapshot?.order?.price === 'number'
          ? snapshot.order.price
          : sourceOrder.custom_price,
      description: sourceOrder.description,
      order_address: sourceOrder.order_address,
      scheduled_at: sourceOrder.scheduled_at,
      service_date: sourceOrder.service_date,
      payment_method: sourceOrder.payment_method,
    })
    .select('id')
    .single();

  if (error || !created) {
    throw new Error(error?.message ?? 'Не удалось создать корректировку');
  }

  await supabase.from('activity_logs').insert([
    {
      order_id: sourceOrder.id,
      user_id: user.id,
      action_type: 'invoice_correction_created',
      action_text: `Создана корректировка к счету ${sourceOrder.invoice_number}`,
    },
    {
      order_id: created.id,
      user_id: user.id,
      action_type: 'correction_draft_created',
      action_text: `Черновик корректировки создан для счета ${sourceOrder.invoice_number}`,
    },
  ]);

  revalidatePath('/orders');
  revalidatePath(`/orders/${sourceOrder.id}`);
  redirect(`/orders/${created.id}?edit=1`);
}

export async function softDeleteOrderAction(id: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Не авторизован');

  const { error } = await supabase
    .from('orders')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) throw new Error(error.message);

  await supabase.from('activity_logs').insert({
    order_id: id,
    user_id: user.id,
    action_type: 'soft_deleted',
    action_text: 'Перемещен в корзину',
  });

  revalidatePath('/orders');
  revalidatePath('/orders/trash');
  redirect('/orders');
}

export async function restoreOrderAction(id: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
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

export async function permanentDeleteOrderAction(id: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Не авторизован');

  const { data: order } = await supabase
    .from('orders')
    .select('invoice_number, deleted_at')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!order) throw new Error('Заказ не найден');
  if (order.invoice_number) {
    throw new Error(
      'Нельзя удалить: по заказу выставлен счет. Исходные документы нужно хранить и не удалять silently.'
    );
  }
  if (!order.deleted_at) {
    throw new Error('Сначала переместите в корзину');
  }

  const { data: photos } = await supabase
    .from('order_photos')
    .select('file_path')
    .eq('order_id', id);

  if (photos && photos.length > 0) {
    await supabase.storage.from('order-photos').remove(photos.map((p) => p.file_path));
  }

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
