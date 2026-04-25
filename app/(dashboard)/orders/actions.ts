'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getLocale } from '@/lib/i18n/server';
import { validateCsrfFormData } from '@/lib/csrf/server';
import { createClient } from '@/lib/supabase/server';
import {
  normalizeOrderInput,
  validateOrder,
  type OrderValidationErrors,
} from '@/lib/validators/order';

export type OrderFormState = {
  errors?: OrderValidationErrors;
  formError?: string;
  values?: any; // Используем any для гибкости с массивом услуг
};

type UiLocale = 'ru' | 'de';

function getMessages(locale: UiLocale) {
  if (locale === 'de') {
    return {
      csrfFailed: 'CSRF-Pruefung fehlgeschlagen',
      unauthorized: 'Nicht autorisiert',
      genericError: 'Fehler',
      chooseClient: 'Bitte waehlen Sie einen Kunden aus',
      clientCreateError: 'Fehler beim Erstellen des Kunden',
      orderCreateError: 'Fehler beim Erstellen des Auftrags',
      orderNotFound: 'Auftrag nicht gefunden',
      invoiceEditBlocked: 'Dieser Auftrag ist bereits mit einer Quittung verknuepft.',
      customerRequired: 'Bitte waehlen Sie einen Kunden aus',
    };
  }

  return {
    csrfFailed: 'Проверка CSRF не пройдена',
    unauthorized: 'Нет авторизации',
    genericError: 'Ошибка',
    chooseClient: 'Выберите клиента',
    clientCreateError: 'Ошибка при создании клиента',
    orderCreateError: 'Ошибка при создании заказа',
    orderNotFound: 'Заказ не найден',
    invoiceEditBlocked: 'Этот заказ уже связан с квитанцией.',
    customerRequired: 'Выберите клиента',
  };
}

function readFormData(formData: FormData): any {
  const items: any[] = [];
  let i = 0;
  while (formData.has(`items[${i}].title`)) {
    items.push({
      service_id: String(formData.get(`items[${i}].service_id`) ?? 'custom'),
      title: String(formData.get(`items[${i}].title`) ?? ''),
      price: String(formData.get(`items[${i}].price`) ?? ''),
      save_to_catalog: formData.get(`items[${i}].save_to_catalog`) === 'true',
    });
    i++;
  }

  return {
    client_id: String(formData.get('client_id') ?? ''),
    client_quick_name: String(formData.get('client_quick_name') ?? ''),
    client_quick_phone: String(formData.get('client_quick_phone') ?? ''),
    client_quick_address: String(formData.get('client_quick_address') ?? ''),
    client_quick_postal_code: String(formData.get('client_quick_postal_code') ?? ''),
    client_quick_city: String(formData.get('client_quick_city') ?? ''),
    correction_reason: String(formData.get('correction_reason') ?? ''),
    items,
    description: String(formData.get('description') ?? ''),
    order_address: String(formData.get('order_address') ?? ''),
    scheduled_at: String(formData.get('scheduled_at') ?? ''),
    service_date: String(formData.get('service_date') ?? ''),
    payment_method: String(formData.get('payment_method') ?? ''),
    payment_provider: String(formData.get('payment_provider') ?? ''),
    paid_at: String(formData.get('paid_at') ?? ''),
  };
}

async function syncItemsToCatalog(
  supabase: any,
  userId: string,
  items: any[]
) {
  for (const item of items) {
    if (item.save_to_catalog && item.title) {
      // Проверяем, нет ли уже такой услуги
      const { data: existing } = await supabase
        .from('services')
        .select('id')
        .eq('user_id', userId)
        .ilike('title', item.title)
        .maybeSingle();

      if (!existing) {
        await supabase.from('services').insert({
          user_id: userId,
          title: item.title,
          default_price: item.price,
        });
      }
    }
  }
}

export async function createOrderAction(
  _prevState: OrderFormState,
  formData: FormData
): Promise<OrderFormState> {
  const locale = await getLocale();
  const m = getMessages(locale);

  try {
    await validateCsrfFormData(formData);
  } catch {
    return { formError: m.csrfFailed };
  }

  const raw = readFormData(formData);
  const errors = validateOrder(raw);
  if (Object.keys(errors).length > 0) return { errors, values: raw };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { formError: m.unauthorized, values: raw };

  const normalized = normalizeOrderInput(raw);
  await syncItemsToCatalog(supabase, user.id, normalized.items);

  let clientId = normalized.client_id;

  // Если клиент новый, создаем его
  if (!clientId && normalized.client_quick_name) {
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
      return { formError: m.clientCreateError, values: raw };
    }
    clientId = client.id;
  }

  if (!clientId) return { formError: m.chooseClient, values: raw };

  // Создаем заказ
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      user_id: user.id,
      client_id: clientId,
      status: 'new',
      description: normalized.description,
      order_address: normalized.order_address || normalized.client_quick_address,
      scheduled_at: normalized.scheduled_at,
      service_date: normalized.service_date,
      payment_method: normalized.payment_method,
      payment_provider: normalized.payment_provider,
      paid_at: normalized.paid_at,
      // Для обратной совместимости сохраняем первую услугу в основные поля заказа
      service_id: normalized.items[0].service_id,
      custom_service_title: normalized.items[0].service_id ? null : normalized.items[0].title,
      custom_price: normalized.items[0].price,
    })
    .select('id')
    .single();

  if (orderError || !order) return { formError: m.orderCreateError, values: raw };

  // Сохраняем все услуги в order_items
  const orderItems = normalized.items.map(item => ({
    order_id: order.id,
    user_id: user.id,
    service_id: item.service_id,
    title: item.title,
    price: item.price,
  }));

  const { error: itemsError } = await supabase.from('order_items').insert(orderItems);
  if (itemsError) return { formError: `Fehler beim Speichern der Leistungen: ${itemsError.message}`, values: raw };

  revalidatePath('/orders');
  revalidatePath('/services');
  redirect(`/orders/${order.id}`);
}

// ... остальной код (updateOrderAction и т.д.) нужно будет также обновить по аналогии
