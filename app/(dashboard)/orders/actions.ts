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
  values?: any; 
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
      invoiceEditBlockedLog: 'Bearbeitungsversuch nach Quittungserstellung blockiert',
      invoiceEditBlocked: 'Dieser Auftrag ist bereits mit einer Quittung verknuepft. Originaldaten koennen nicht mehr direkt bearbeitet werden. Verwenden Sie stattdessen eine Quittungskorrektur.',
      customerRequired: 'Bitte waehlen Sie einen Kunden aus',
      orderUpdatedLog: 'Auftragsdaten wurden после Speichern aktualisiert',
      sourceOrderNotFound: 'Ausgangsauftrag nicht gefunden',
      correctionNeedsInvoice: 'Ein Korrekturentwurf kann erst erstellt werden, wenn fuer den Auftrag bereits eine Quittung existiert.',
      correctionAlreadyFromCorrection: 'Fuer eine bestehende Korrektur kann kein weiterer Korrekturentwurf erstellt werden.',
      correctionReasonPrefix: 'Korrektur zu Quittung',
      correctionCreateError: 'Korrekturentwurf konnte nicht erstellt werden',
      correctionCreatedLogPrefix: 'Korrektur zur Quittung erstellt',
      correctionDraftCreatedLogPrefix: 'Korrekturentwurf erstellt fuer Quittung',
      movedToTrashLog: 'Auftrag in den Papierkorb verschoben',
      restoredLog: 'Auftrag aus dem Papierkorb wiederhergestellt',
      cannotDeleteInvoice: 'Endgueltiges Loeschen ist nicht moeglich, weil fuer diesen Auftrag bereits eine Quittung erstellt wurde.',
      deleteBlockedByActivityLogs: 'Endgueltiges Loeschen ist blockiert, weil alte Aktivitaetsprotokolle еще жестко привязаны.',
      moveToTrashFirst: 'Der Auftrag muss zuerst in den Papierkorb verschoben werden.',
      sumupTransactionMissing: 'SumUp Zahlung nicht gefunden',
      sumupAlreadyLinked: 'Diese SumUp Zahlung ist bereits mit einem Auftrag verknuepft',
      sumupLinkLogPrefix: 'SumUp Zahlung verknuepft',
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
    invoiceEditBlockedLog: 'Попытка изменить заказ после выдачи квитанции заблокирована',
    invoiceEditBlocked: 'Этот заказ уже связан с квитанцией. Его нельзя редактировать напрямую.',
    customerRequired: 'Выберите клиента',
    orderUpdatedLog: 'Данные заказа обновлены',
    sourceOrderNotFound: 'Исходный заказ не найден',
    correctionNeedsInvoice: 'Черновик корректировки можно создать только после квитанции.',
    correctionAlreadyFromCorrection: 'Для корректировки нельзя создать еще один черновик.',
    correctionReasonPrefix: 'Корректировка к квитанции',
    correctionCreateError: 'Не удалось создать черновик корректировки',
    correctionCreatedLogPrefix: 'Создана корректировка к квитанции',
    correctionDraftCreatedLogPrefix: 'Черновик корректировки создан',
    movedToTrashLog: 'Заказ перемещен в корзину',
    restoredLog: 'Заказ восстановлен',
    cannotDeleteInvoice: 'Нельзя удалить навсегда: уже создана квитанция.',
    deleteBlockedByActivityLogs: 'Удаление заблокировано логами активности.',
    moveToTrashFirst: 'Сначала переместите заказ в корзину.',
    sumupTransactionMissing: 'Оплата SumUp не найдена',
    sumupAlreadyLinked: 'Эта оплата уже привязана к другому заказу',
    sumupLinkLogPrefix: 'Оплата SumUp привязана',
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

async function syncItemsToCatalog(supabase: any, userId: string, items: any[]) {
  for (const item of items) {
    if (item.save_to_catalog && item.title) {
      const { data: existing } = await supabase.from('services').select('id').eq('user_id', userId).ilike('title', item.title).maybeSingle();
      if (!existing) {
        await supabase.from('services').insert({ user_id: userId, title: item.title, default_price: item.price });
      }
    }
  }
}

export async function createOrderAction(_prevState: OrderFormState, formData: FormData): Promise<OrderFormState> {
  const locale = await getLocale();
  const m = getMessages(locale);
  try { await validateCsrfFormData(formData); } catch { return { formError: m.csrfFailed }; }
  const raw = readFormData(formData);
  const errors = validateOrder(raw);
  if (Object.keys(errors).length > 0) return { errors, values: raw };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { formError: m.unauthorized, values: raw };
  const normalized = normalizeOrderInput(raw);
  await syncItemsToCatalog(supabase, user.id, normalized.items);
  let clientId = normalized.client_id;
  if (!clientId && normalized.client_quick_name) {
    const { data: client, error: clientError } = await supabase.from('clients').insert({
      user_id: user.id, full_name: normalized.client_quick_name, phone: normalized.client_quick_phone,
      address: normalized.client_quick_address, postal_code: normalized.client_quick_postal_code, city: normalized.client_quick_city
    }).select('id').single();
    if (clientError || !client) return { formError: m.clientCreateError, values: raw };
    clientId = client.id;
  }
  if (!clientId) return { formError: m.chooseClient, values: raw };
  const { data: order, error: orderError } = await supabase.from('orders').insert({
    user_id: user.id, client_id: clientId, status: 'new', description: normalized.description,
    order_address: normalized.order_address || normalized.client_quick_address,
    scheduled_at: normalized.scheduled_at, service_date: normalized.service_date,
    payment_method: normalized.payment_method, payment_provider: normalized.payment_provider, paid_at: normalized.paid_at,
    service_id: normalized.items[0].service_id, custom_service_title: normalized.items[0].service_id ? null : normalized.items[0].title, custom_price: normalized.items[0].price
  }).select('id').single();
  if (orderError || !order) return { formError: m.orderCreateError, values: raw };
  const orderItems = normalized.items.map(item => ({ order_id: order.id, user_id: user.id, service_id: item.service_id, title: item.title, price: item.price }));
  await supabase.from('order_items').insert(orderItems);
  revalidatePath('/orders');
  revalidatePath('/services');
  redirect(`/orders/${order.id}`);
}

export async function updateOrderAction(id: string, _prevState: OrderFormState, formData: FormData): Promise<OrderFormState> {
  const locale = await getLocale();
  const m = getMessages(locale);
  try { await validateCsrfFormData(formData); } catch { return { formError: m.csrfFailed }; }
  const raw = readFormData(formData);
  const errors = validateOrder(raw);
  delete errors.client_quick_name; delete errors.client_quick_phone; delete errors.client_quick_address; delete errors.client_quick_postal_code; delete errors.client_quick_city;
  if (!raw.client_id.trim()) errors.client_id = m.customerRequired;
  if (Object.keys(errors).length > 0) return { errors, values: raw };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { formError: m.unauthorized, values: raw };
  const { data: currentOrder } = await supabase.from('orders').select('id, invoice_number, invoice_locked_at').eq('id', id).eq('user_id', user.id).maybeSingle();
  if (!currentOrder) return { formError: m.orderNotFound, values: raw };
  if (currentOrder.invoice_number || currentOrder.invoice_locked_at) {
    await supabase.from('activity_logs').insert({ order_id: id, user_id: user.id, action_type: 'invoice_edit_blocked', action_text: m.invoiceEditBlockedLog });
    return { formError: m.invoiceEditBlocked, values: raw };
  }
  const normalized = normalizeOrderInput(raw);
  await syncItemsToCatalog(supabase, user.id, normalized.items);
  const { items: normalizedItems, client_quick_name: _, client_quick_phone: __, client_quick_address: ___, client_quick_postal_code: ____, client_quick_city: _____, ...updateData } = normalized;
  const { error } = await supabase.from('orders').update({
    ...updateData,
    service_id: normalizedItems[0].service_id,
    custom_service_title: normalizedItems[0].service_id ? null : normalizedItems[0].title,
    custom_price: normalizedItems[0].price
  }).eq('id', id).eq('user_id', user.id);
  if (error) return { formError: error.message, values: raw };
  await supabase.from('order_items').delete().eq('order_id', id).eq('user_id', user.id);
  const orderItems = normalizedItems.map(item => ({ order_id: id, user_id: user.id, service_id: item.service_id, title: item.title, price: item.price }));
  await supabase.from('order_items').insert(orderItems);
  await supabase.from('activity_logs').insert({ order_id: id, user_id: user.id, action_type: 'order_updated', action_text: m.orderUpdatedLog });
  revalidatePath('/orders');
  revalidatePath(`/orders/${id}`);
  redirect(`/orders/${id}`);
}

export async function linkSumupTransactionAction(orderId: string, sumupTransactionId: string, paymentMethodOverride?: 'cash' | 'ec_card'): Promise<{ ok: boolean; error?: string }> {
  const locale = await getLocale(); const m = getMessages(locale); const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser(); if (!user) return { ok: false, error: m.unauthorized };
  const { data: order } = await supabase.from('orders').select('id, invoice_number, invoice_locked_at, payment_method').eq('id', orderId).eq('user_id', user.id).maybeSingle();
  if (!order) return { ok: false, error: m.orderNotFound };
  const { data: transaction } = await supabase.from('sumup_transactions').select('id, order_id, receipt_no, paid_at, amount, transaction_code, sumup_transaction_id').eq('id', sumupTransactionId).eq('user_id', user.id).maybeSingle();
  if (!transaction) return { ok: false, error: m.sumupTransactionMissing };
  if (transaction.order_id && transaction.order_id !== orderId) return { ok: false, error: m.sumupAlreadyLinked };
  await supabase.from('sumup_transactions').update({ order_id: orderId }).eq('id', sumupTransactionId).eq('user_id', user.id);
  if (!order.invoice_number && !order.invoice_locked_at) {
    const paymentMethod = paymentMethodOverride ?? (order.payment_method === 'cash' ? 'cash' : 'ec_card');
    await supabase.from('orders').update({ payment_method: paymentMethod, payment_provider: 'sumup', paid_at: transaction.paid_at, sumup_transaction_id: transaction.id, sumup_receipt_no: transaction.receipt_no }).eq('id', orderId).eq('user_id', user.id);
  }
  await supabase.from('activity_logs').insert({ order_id: orderId, user_id: user.id, action_type: 'sumup_payment_linked', action_text: `${m.sumupLinkLogPrefix}: ${transaction.receipt_no ?? transaction.transaction_code ?? transaction.id} (${transaction.amount})` });
  revalidatePath(`/orders/${orderId}`); return { ok: true };
}

export async function updateLinkedSumupPaymentMethodAction(orderId: string, paymentMethod: 'cash' | 'ec_card'): Promise<{ ok: boolean; error?: string }> {
  const locale = await getLocale(); const m = getMessages(locale); const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser(); if (!user) return { ok: false, error: m.unauthorized };
  const { data: order } = await supabase.from('orders').select('id, invoice_number, invoice_locked_at, sumup_transaction_id').eq('id', orderId).eq('user_id', user.id).maybeSingle();
  if (!order) return { ok: false, error: m.orderNotFound }; if (order.invoice_number || order.invoice_locked_at) return { ok: false, error: m.invoiceEditBlocked };
  await supabase.from('orders').update({ payment_method: paymentMethod }).eq('id', orderId).eq('user_id', user.id);
  await supabase.from('activity_logs').insert({ order_id: orderId, user_id: user.id, action_type: 'sumup_payment_method_updated', action_text: `${m.sumupLinkLogPrefix}: ${paymentMethod}` });
  revalidatePath(`/orders/${orderId}`); return { ok: true };
}

export async function createCorrectionDraftAction(orderId: string): Promise<void> {
  const locale = await getLocale(); const m = getMessages(locale); const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser(); if (!user) throw new Error(m.unauthorized);
  const { data: src } = await supabase.from('orders').select('*').eq('id', orderId).eq('user_id', user.id).maybeSingle();
  if (!src || !src.invoice_number) throw new Error(m.sourceOrderNotFound);
  const { data: created, error } = await supabase.from('orders').insert({
    user_id: user.id, correction_of_order_id: src.id, correction_reason: `${m.correctionReasonPrefix} ${src.invoice_number}`, status: 'new', client_id: src.client_id, service_id: src.service_id, custom_service_title: src.custom_service_title, custom_price: src.custom_price, description: src.description, order_address: src.order_address, service_date: src.service_date, payment_method: src.payment_method
  }).select('id').single();
  if (error || !created) throw new Error(m.correctionCreateError);
  await supabase.from('activity_logs').insert([{ order_id: src.id, user_id: user.id, action_type: 'invoice_correction_created', action_text: `${m.correctionCreatedLogPrefix} ${src.invoice_number}` }, { order_id: created.id, user_id: user.id, action_type: 'correction_draft_created', action_text: `${m.correctionDraftCreatedLogPrefix} ${src.invoice_number}` }]);
  revalidatePath('/orders'); redirect(`/orders/${created.id}?edit=1`);
}

export async function softDeleteOrderAction(id: string): Promise<void> {
  const locale = await getLocale(); const m = getMessages(locale); const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser(); if (!user) throw new Error(m.unauthorized);
  await supabase.from('orders').update({ deleted_at: new Date().toISOString() }).eq('id', id).eq('user_id', user.id);
  await supabase.from('activity_logs').insert({ order_id: id, user_id: user.id, action_type: 'soft_deleted', action_text: m.movedToTrashLog });
  revalidatePath('/orders'); revalidatePath('/orders/trash'); redirect('/orders');
}

export async function restoreOrderAction(id: string): Promise<{ error: string } | void> {
  const locale = await getLocale(); const m = getMessages(locale); const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser(); if (!user) return { error: m.unauthorized };
  await supabase.from('orders').update({ deleted_at: null }).eq('id', id).eq('user_id', user.id);
  await supabase.from('activity_logs').insert({ order_id: id, user_id: user.id, action_type: 'restored', action_text: m.restoredLog });
  revalidatePath('/orders'); revalidatePath('/orders/trash'); redirect(`/orders/${id}`);
}

export async function permanentDeleteOrderAction(id: string): Promise<{ error: string } | void> {
  const locale = await getLocale(); const m = getMessages(locale); const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser(); if (!user) return { error: m.unauthorized };
  const { data: order } = await supabase.from('orders').select('invoice_number, deleted_at').eq('id', id).eq('user_id', user.id).maybeSingle();
  if (!order) return { error: m.orderNotFound }; if (order.invoice_number) return { error: m.cannotDeleteInvoice }; if (!order.deleted_at) return { error: m.moveToTrashFirst };
  const { error } = await supabase.from('orders').delete().eq('id', id).eq('user_id', user.id);
  if (error) return { error: error.message };
  revalidatePath('/orders'); revalidatePath('/orders/trash'); redirect('/orders/trash');
}
