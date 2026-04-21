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
      invoiceEditBlockedLog:
        'Bearbeitungsversuch nach Rechnungserstellung wurde blockiert',
      invoiceEditBlocked:
        'Dieser Auftrag ist bereits mit einer Rechnung verknuepft. Originaldaten koennen nicht mehr direkt bearbeitet werden. Verwenden Sie stattdessen eine Rechnungskorrektur.',
      customerRequired: 'Bitte waehlen Sie einen Kunden aus',
      orderUpdatedLog: 'Auftragsdaten wurden nach dem Speichern aktualisiert',
      sourceOrderNotFound: 'Ausgangsauftrag nicht gefunden',
      correctionNeedsInvoice:
        'Ein Korrekturentwurf kann erst erstellt werden, wenn fuer den Auftrag bereits eine Rechnung existiert.',
      correctionAlreadyFromCorrection:
        'Fuer eine bestehende Korrektur kann kein weiterer Korrekturentwurf erstellt werden.',
      correctionReasonPrefix: 'Korrektur zu Rechnung',
      correctionCreateError: 'Korrekturentwurf konnte nicht erstellt werden',
      correctionCreatedLogPrefix: 'Korrektur zur Rechnung erstellt',
      correctionDraftCreatedLogPrefix: 'Korrekturentwurf erstellt fuer Rechnung',
      movedToTrashLog: 'Auftrag in den Papierkorb verschoben',
      restoredLog: 'Auftrag aus dem Papierkorb wiederhergestellt',
      cannotDeleteInvoice:
        'Endgueltiges Loeschen ist nicht moeglich, weil fuer diesen Auftrag bereits eine Rechnung erstellt wurde.',
      moveToTrashFirst:
        'Der Auftrag muss zuerst in den Papierkorb verschoben werden.',
    };
  }

  return {
    csrfFailed: '\u041f\u0440\u043e\u0432\u0435\u0440\u043a\u0430 CSRF \u043d\u0435 \u043f\u0440\u043e\u0439\u0434\u0435\u043d\u0430',
    unauthorized: '\u041d\u0435\u0442 \u0430\u0432\u0442\u043e\u0440\u0438\u0437\u0430\u0446\u0438\u0438',
    genericError: '\u041e\u0448\u0438\u0431\u043a\u0430',
    chooseClient: '\u0412\u044b\u0431\u0435\u0440\u0438\u0442\u0435 \u043a\u043b\u0438\u0435\u043d\u0442\u0430',
    clientCreateError: '\u041e\u0448\u0438\u0431\u043a\u0430 \u043f\u0440\u0438 \u0441\u043e\u0437\u0434\u0430\u043d\u0438\u0438 \u043a\u043b\u0438\u0435\u043d\u0442\u0430',
    orderCreateError: '\u041e\u0448\u0438\u0431\u043a\u0430 \u043f\u0440\u0438 \u0441\u043e\u0437\u0434\u0430\u043d\u0438\u0438 \u0437\u0430\u043a\u0430\u0437\u0430',
    orderNotFound: '\u0417\u0430\u043a\u0430\u0437 \u043d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d',
    invoiceEditBlockedLog:
      '\u041f\u043e\u043f\u044b\u0442\u043a\u0430 \u0438\u0437\u043c\u0435\u043d\u0438\u0442\u044c \u0437\u0430\u043a\u0430\u0437 \u043f\u043e\u0441\u043b\u0435 \u0432\u044b\u043f\u0438\u0441\u0430\u043d\u043d\u043e\u0433\u043e \u0441\u0447\u0435\u0442\u0430 \u0431\u044b\u043b\u0430 \u0437\u0430\u0431\u043b\u043e\u043a\u0438\u0440\u043e\u0432\u0430\u043d\u0430',
    invoiceEditBlocked:
      '\u042d\u0442\u043e\u0442 \u0437\u0430\u043a\u0430\u0437 \u0443\u0436\u0435 \u0441\u0432\u044f\u0437\u0430\u043d \u0441\u043e \u0441\u0447\u0435\u0442\u043e\u043c. \u0418\u0441\u0445\u043e\u0434\u043d\u044b\u0435 \u0434\u0430\u043d\u043d\u044b\u0435 \u0431\u043e\u043b\u044c\u0448\u0435 \u043d\u0435\u043b\u044c\u0437\u044f \u0438\u0437\u043c\u0435\u043d\u044f\u0442\u044c \u043d\u0430\u043f\u0440\u044f\u043c\u0443\u044e. \u0418\u0441\u043f\u043e\u043b\u044c\u0437\u0443\u0439\u0442\u0435 \u043a\u043e\u0440\u0440\u0435\u043a\u0442\u0438\u0440\u043e\u0432\u043a\u0443 \u0441\u0447\u0435\u0442\u0430.',
    customerRequired: '\u0412\u044b\u0431\u0435\u0440\u0438\u0442\u0435 \u043a\u043b\u0438\u0435\u043d\u0442\u0430',
    orderUpdatedLog:
      '\u0414\u0430\u043d\u043d\u044b\u0435 \u0437\u0430\u043a\u0430\u0437\u0430 \u043e\u0431\u043d\u043e\u0432\u043b\u0435\u043d\u044b \u043f\u043e\u0441\u043b\u0435 \u0441\u043e\u0445\u0440\u0430\u043d\u0435\u043d\u0438\u044f',
    sourceOrderNotFound:
      '\u0418\u0441\u0445\u043e\u0434\u043d\u044b\u0439 \u0437\u0430\u043a\u0430\u0437 \u043d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d',
    correctionNeedsInvoice:
      '\u0427\u0435\u0440\u043d\u043e\u0432\u0438\u043a \u043a\u043e\u0440\u0440\u0435\u043a\u0442\u0438\u0440\u043e\u0432\u043a\u0438 \u043c\u043e\u0436\u043d\u043e \u0441\u043e\u0437\u0434\u0430\u0442\u044c \u0442\u043e\u043b\u044c\u043a\u043e \u043f\u043e\u0441\u043b\u0435 \u0432\u044b\u043f\u0438\u0441\u0430\u043d\u043d\u043e\u0433\u043e \u0441\u0447\u0435\u0442\u0430.',
    correctionAlreadyFromCorrection:
      '\u0414\u043b\u044f \u0443\u0436\u0435 \u0441\u043e\u0437\u0434\u0430\u043d\u043d\u043e\u0439 \u043a\u043e\u0440\u0440\u0435\u043a\u0442\u0438\u0440\u043e\u0432\u043a\u0438 \u043d\u0435\u043b\u044c\u0437\u044f \u0441\u043e\u0437\u0434\u0430\u0442\u044c \u0435\u0449\u0435 \u043e\u0434\u0438\u043d \u0447\u0435\u0440\u043d\u043e\u0432\u0438\u043a.',
    correctionReasonPrefix: '\u041a\u043e\u0440\u0440\u0435\u043a\u0442\u0438\u0440\u043e\u0432\u043a\u0430 \u043a \u0441\u0447\u0435\u0442\u0443',
    correctionCreateError:
      '\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0441\u043e\u0437\u0434\u0430\u0442\u044c \u0447\u0435\u0440\u043d\u043e\u0432\u0438\u043a \u043a\u043e\u0440\u0440\u0435\u043a\u0442\u0438\u0440\u043e\u0432\u043a\u0438',
    correctionCreatedLogPrefix:
      '\u0421\u043e\u0437\u0434\u0430\u043d\u0430 \u043a\u043e\u0440\u0440\u0435\u043a\u0442\u0438\u0440\u043e\u0432\u043a\u0430 \u043a \u0441\u0447\u0435\u0442\u0443',
    correctionDraftCreatedLogPrefix:
      '\u0427\u0435\u0440\u043d\u043e\u0432\u0438\u043a \u043a\u043e\u0440\u0440\u0435\u043a\u0442\u0438\u0440\u043e\u0432\u043a\u0438 \u0441\u043e\u0437\u0434\u0430\u043d \u0434\u043b\u044f \u0441\u0447\u0435\u0442\u0430',
    movedToTrashLog: '\u0417\u0430\u043a\u0430\u0437 \u043f\u0435\u0440\u0435\u043c\u0435\u0449\u0435\u043d \u0432 \u043a\u043e\u0440\u0437\u0438\u043d\u0443',
    restoredLog: '\u0417\u0430\u043a\u0430\u0437 \u0432\u043e\u0441\u0441\u0442\u0430\u043d\u043e\u0432\u043b\u0435\u043d \u0438\u0437 \u043a\u043e\u0440\u0437\u0438\u043d\u044b',
    cannotDeleteInvoice:
      '\u041d\u0435\u043b\u044c\u0437\u044f \u0443\u0434\u0430\u043b\u0438\u0442\u044c \u043d\u0430\u0432\u0441\u0435\u0433\u0434\u0430: \u0434\u043b\u044f \u044d\u0442\u043e\u0433\u043e \u0437\u0430\u043a\u0430\u0437\u0430 \u0443\u0436\u0435 \u0441\u043e\u0437\u0434\u0430\u043d \u0441\u0447\u0435\u0442.',
    moveToTrashFirst:
      '\u0421\u043d\u0430\u0447\u0430\u043b\u0430 \u043f\u0435\u0440\u0435\u043c\u0435\u0441\u0442\u0438\u0442\u0435 \u0437\u0430\u043a\u0430\u0437 \u0432 \u043a\u043e\u0440\u0437\u0438\u043d\u0443.',
  };
}

function prefixError(prefix: string, message: string) {
  return `${prefix}: ${message}`;
}

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
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { formError: m.unauthorized, values: raw };

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

    if (error) {
      return { formError: prefixError(m.orderCreateError, error.message), values: raw };
    }

    revalidatePath('/orders');
    redirect(`/orders/${data.id}`);
  }

  if (!normalized.client_quick_name) {
    return { formError: m.chooseClient, values: raw };
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
    return {
      formError: prefixError(m.clientCreateError, clientError?.message ?? m.genericError),
      values: raw,
    };
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
    return {
      formError: prefixError(m.orderCreateError, orderError?.message ?? m.genericError),
      values: raw,
    };
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
  const locale = await getLocale();
  const m = getMessages(locale);

  try {
    await validateCsrfFormData(formData);
  } catch {
    return { formError: m.csrfFailed };
  }

  const raw = readFormData(formData);
  const errors = validateOrder(raw);
  delete errors.client_quick_name;
  delete errors.client_quick_phone;
  delete errors.client_quick_address;
  delete errors.client_quick_postal_code;
  delete errors.client_quick_city;

  if (!raw.client_id.trim()) {
    errors.client_id = m.customerRequired;
  }

  if (Object.keys(errors).length > 0) return { errors, values: raw };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { formError: m.unauthorized, values: raw };

  const { data: currentOrder } = await supabase
    .from('orders')
    .select('id, invoice_number, invoice_locked_at, correction_of_order_id')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!currentOrder) {
    return { formError: m.orderNotFound, values: raw };
  }

  if (currentOrder.invoice_number || currentOrder.invoice_locked_at) {
    await supabase.from('activity_logs').insert({
      order_id: id,
      user_id: user.id,
      action_type: 'invoice_edit_blocked',
      action_text: m.invoiceEditBlockedLog,
    });

    return { formError: m.invoiceEditBlocked, values: raw };
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
    return { formError: m.chooseClient, values: raw };
  }

  const { error } = await supabase.from('orders').update(updateData).eq('id', id).eq('user_id', user.id);

  if (error) return { formError: prefixError(m.genericError, error.message), values: raw };

  await supabase.from('activity_logs').insert({
    order_id: id,
    user_id: user.id,
    action_type: 'order_updated',
    action_text: m.orderUpdatedLog,
  });

  revalidatePath('/orders');
  revalidatePath(`/orders/${id}`);
  redirect(`/orders/${id}`);
}

export async function changeOrderStatusAction(id: string, status: OrderStatus): Promise<void> {
  const locale = await getLocale();
  const m = getMessages(locale);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error(m.unauthorized);

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

  const { error } = await supabase.from('orders').update(updates).eq('id', id).eq('user_id', user.id);

  if (error) throw new Error(error.message);

  revalidatePath('/orders');
  revalidatePath(`/orders/${id}`);
}

export async function createCorrectionDraftAction(orderId: string): Promise<void> {
  const locale = await getLocale();
  const m = getMessages(locale);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error(m.unauthorized);

  const { data: sourceOrder } = await supabase
    .from('orders')
    .select(
      'id, user_id, correction_of_order_id, client_id, service_id, custom_service_title, custom_price, description, order_address, scheduled_at, service_date, payment_method, invoice_number, invoice_snapshot_json'
    )
    .eq('id', orderId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!sourceOrder) throw new Error(m.sourceOrderNotFound);
  if (!sourceOrder.invoice_number) throw new Error(m.correctionNeedsInvoice);
  if (sourceOrder.correction_of_order_id) throw new Error(m.correctionAlreadyFromCorrection);

  const snapshot =
    sourceOrder.invoice_snapshot_json && typeof sourceOrder.invoice_snapshot_json === 'object'
      ? (sourceOrder.invoice_snapshot_json as { order?: Record<string, unknown> })
      : null;

  const { data: created, error } = await supabase
    .from('orders')
    .insert({
      user_id: user.id,
      correction_of_order_id: sourceOrder.id,
      correction_reason: `${m.correctionReasonPrefix} ${sourceOrder.invoice_number}`,
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
    throw new Error(error?.message ?? m.correctionCreateError);
  }

  await supabase.from('activity_logs').insert([
    {
      order_id: sourceOrder.id,
      user_id: user.id,
      action_type: 'invoice_correction_created',
      action_text: `${m.correctionCreatedLogPrefix} ${sourceOrder.invoice_number}`,
    },
    {
      order_id: created.id,
      user_id: user.id,
      action_type: 'correction_draft_created',
      action_text: `${m.correctionDraftCreatedLogPrefix} ${sourceOrder.invoice_number}`,
    },
  ]);

  revalidatePath('/orders');
  revalidatePath(`/orders/${sourceOrder.id}`);
  redirect(`/orders/${created.id}?edit=1`);
}

export async function softDeleteOrderAction(id: string): Promise<void> {
  const locale = await getLocale();
  const m = getMessages(locale);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error(m.unauthorized);

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
    action_text: m.movedToTrashLog,
  });

  revalidatePath('/orders');
  revalidatePath('/orders/trash');
  redirect('/orders');
}

export async function restoreOrderAction(id: string): Promise<void> {
  const locale = await getLocale();
  const m = getMessages(locale);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error(m.unauthorized);

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
    action_text: m.restoredLog,
  });

  revalidatePath('/orders');
  revalidatePath('/orders/trash');
  revalidatePath(`/orders/${id}`);
  redirect(`/orders/${id}`);
}

export async function permanentDeleteOrderAction(id: string): Promise<void> {
  const locale = await getLocale();
  const m = getMessages(locale);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error(m.unauthorized);

  const { data: order } = await supabase
    .from('orders')
    .select('invoice_number, deleted_at')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!order) throw new Error(m.orderNotFound);
  if (order.invoice_number) throw new Error(m.cannotDeleteInvoice);
  if (!order.deleted_at) throw new Error(m.moveToTrashFirst);

  const { data: photos } = await supabase.from('order_photos').select('file_path').eq('order_id', id);

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

  const { error } = await supabase.from('orders').delete().eq('id', id).eq('user_id', user.id);

  if (error) throw new Error(error.message);

  revalidatePath('/orders');
  revalidatePath('/orders/trash');
  redirect('/orders/trash');
}
