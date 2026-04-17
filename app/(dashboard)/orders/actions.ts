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
    service_id: string;
    custom_service_title: string;
    custom_price: string;
    description: string;
    order_address: string;
    scheduled_at: string;
  };
};

function readFormData(formData: FormData): OrderFormState['values'] & object {
  return {
    client_id: String(formData.get('client_id') ?? ''),
    service_id: String(formData.get('service_id') ?? ''),
    custom_service_title: String(formData.get('custom_service_title') ?? ''),
    custom_price: String(formData.get('custom_price') ?? ''),
    description: String(formData.get('description') ?? ''),
    order_address: String(formData.get('order_address') ?? ''),
    scheduled_at: String(formData.get('scheduled_at') ?? ''),
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

  const { data, error } = await supabase
    .from('orders')
    .insert({ user_id: user.id, status: 'new', ...normalized })
    .select('id')
    .single();

  if (error) return { formError: `Ошибка: ${error.message}`, values: raw };

  revalidatePath('/orders');
  redirect(`/orders/${data.id}`);
}

export async function updateOrderAction(
  id: string,
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

  const { error } = await supabase
    .from('orders')
    .update(normalized)
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

  const { error } = await supabase
    .from('orders')
    .update({ status })
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) throw new Error(error.message);

  revalidatePath('/orders');
  revalidatePath(`/orders/${id}`);
}

export async function deleteOrderAction(id: string): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Не авторизован');

  const { error } = await supabase
    .from('orders')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) throw new Error(error.message);

  revalidatePath('/orders');
  redirect('/orders');
}