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
    payment_provider: string;
    paid_at: string;
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
        'Bearbeitungsversuch nach Quittungserstellung wurde blockiert',
      invoiceEditBlocked:
        'Dieser Auftrag ist bereits mit einer Quittung verknuepft. Originaldaten koennen nicht mehr direkt bearbeitet werden. Verwenden Sie stattdessen eine Quittungskorrektur.',
      customerRequired: 'Bitte waehlen Sie einen Kunden aus',
      orderUpdatedLog: 'Auftragsdaten wurden nach dem Speichern aktualisiert',
      sourceOrderNotFound: 'Ausgangsauftrag nicht gefunden',
      correctionNeedsInvoice:
        'Ein Korrekturentwurf kann erst erstellt werden, wenn fuer den Auftrag bereits eine Quittung existiert.',
      correctionAlreadyFromCorrection:
        'Fuer eine bestehende Korrektur kann kein weiterer Korrekturentwurf erstellt werden.',
      correctionReasonPrefix: 'Korrektur zu Quittung',
      correctionCreateError: 'Korrekturentwurf konnte nicht erstellt werden',
      correctionCreatedLogPrefix: 'Korrektur zur Quittung erstellt',
      correctionDraftCreatedLogPrefix: 'Korrekturentwurf erstellt fuer Quittung',
      movedToTrashLog: 'Auftrag in den Papierkorb verschoben',
      restoredLog: 'Auftrag aus dem Papierkorb wiederhergestellt',
      cannotDeleteInvoice:
        'Endgueltiges Loeschen ist nicht moeglich, weil fuer diesen Auftrag bereits eine Quittung erstellt wurde.',
      deleteBlockedByActivityLogs:
        'Endgueltiges Loeschen ist blockiert, weil alte Aktivitaetsprotokolle noch per Datenbank-Referenz am Auftrag haengen. Wenden Sie die SQL-Korrektur fuer activity_logs an und versuchen Sie es erneut.',
      moveToTrashFirst:
        'Der Auftrag muss zuerst in den Papierkorb verschoben werden.',
      sumupTransactionMissing: 'SumUp Zahlung nicht gefunden',
      sumupAlreadyLinked: 'Diese SumUp Zahlung ist bereits mit einem Auftrag verknuepft',
      sumupLinkLogPrefix: 'SumUp Zahlung verknuepft',
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
      '\u041f\u043e\u043f\u044b\u0442\u043a\u0430 \u0438\u0437\u043c\u0435\u043d\u0438\u0442\u044c \u0437\u0430\u043a\u0430\u0437 \u043f\u043e\u0441\u043b\u0435 \u0432\u044b\u0434\u0430\u043d\u043d\u043e\u0439 \u043a\u0432\u0438\u0442\u0430\u043d\u0446\u0438\u0438 \u0431\u044b\u043b\u0430 \u0437\u0430\u0431\u043b\u043e\u043a\u0438\u0440\u043e\u0432\u0430\u043d\u0430',
    invoiceEditBlocked:
      '\u042d\u0442\u043e\u0442 \u0437\u0430\u043a\u0430\u0437 \u0443\u0436\u0435 \u0441\u0432\u044f\u0437\u0430\u043d \u0441 \u043a\u0432\u0438\u0442\u0430\u043d\u0446\u0438\u0435\u0439. \u0418\u0441\u0445\u043e\u0434\u043d\u044b\u0435 \u0434\u0430\u043d\u043d\u044b\u0435 \u0431\u043e\u043b\u044c\u0448\u0435 \u043d\u0435\u043b\u044c\u0437\u044f \u0438\u0437\u043c\u0435\u043d\u044f\u0442\u044c \u043d\u0430\u043f\u0440\u044f\u043c\u0443\u044e. \u0418\u0441\u043f\u043e\u043b\u044c\u0437\u0443\u0439\u0442\u0435 \u043a\u043e\u0440\u0440\u0435\u043a\u0442\u0438\u0440\u043e\u0432\u043a\u0443 \u043a\u0432\u0438\u0442\u0430\u043d\u0446\u0438\u0438.',
    customerRequired: '\u0412\u044b\u0431\u0435\u0440\u0438\u0442\u0435 \u043a\u043b\u0438\u0435\u043d\u0442\u0430',
    orderUpdatedLog:
      '\u0414\u0430\u043d\u043d\u044b\u0435 \u0437\u0430\u043a\u0430\u0437\u0430 \u043e\u0431\u043d\u043e\u0432\u043b\u0435\u043d\u044b \u043f\u043e\u0441\u043b\u0435 \u0441\u043e\u0445\u0440\u0430\u043d\u0435\u043d\u0438\u044f',
    sourceOrderNotFound:
      '\u0418\u0441\u0445\u043e\u0434\u043d\u044b\u0439 \u0437\u0430\u043a\u0430\u0437 \u043d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d',
    correctionNeedsInvoice:
      '\u0427\u0435\u0440\u043d\u043e\u0432\u0438\u043a \u043a\u043e\u0440\u0440\u0435\u043a\u0442\u0438\u0440\u043e\u0432\u043a\u0438 \u043c\u043e\u0436\u043d\u043e \u0441\u043e\u0437\u0434\u0430\u0442\u044c \u0442\u043e\u043b\u044c\u043a\u043e \u043f\u043e\u0441\u043b\u0435 \u0432\u044b\u0434\u0430\u043d\u043d\u043e\u0439 \u043a\u0432\u0438\u0442\u0430\u043d\u0446\u0438\u0438.',
    correctionAlreadyFromCorrection:
      '\u0414\u043b\u044f \u0443\u0436\u0435 \u0441\u043e\u0437\u0434\u0430\u043d\u043d\u043e\u0439 \u043a\u043e\u0440\u0440\u0435\u043a\u0442\u0438\u0440\u043e\u0432\u043a\u0438 \u043d\u0435\u043b\u044c\u0437\u044f \u0441\u043e\u0437\u0434\u0430\u0442\u044c \u0435\u0449\u0435 \u043e\u0434\u0438\u043d \u0447\u0435\u0440\u043d\u043e\u0432\u0438\u043a.',
    correctionReasonPrefix: '\u041a\u043e\u0440\u0440\u0435\u043a\u0442\u0438\u0440\u043e\u0432\u043a\u0430 \u043a \u043a\u0432\u0438\u0442\u0430\u043d\u0446\u0438\u0438',
    correctionCreateError:
      '\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0441\u043e\u0437\u0434\u0430\u0442\u044c \u0447\u0435\u0440\u043d\u043e\u0432\u0438\u043a \u043a\u043e\u0440\u0440\u0435\u043a\u0442\u0438\u0440\u043e\u0432\u043a\u0438',
    correctionCreatedLogPrefix:
      '\u0421\u043e\u0437\u0434\u0430\u043d\u0430 \u043a\u043e\u0440\u0440\u0435\u043a\u0442\u0438\u0440\u043e\u0432\u043a\u0430 \u043a \u043a\u0432\u0438\u0442\u0430\u043d\u0446\u0438\u0438',
    correctionDraftCreatedLogPrefix:
      '\u0427\u0435\u0440\u043d\u043e\u0432\u0438\u043a \u043a\u043e\u0440\u0440\u0435\u043a\u0442\u0438\u0440\u043e\u0432\u043a\u0438 \u0441\u043e\u0437\u0434\u0430\u043d \u0434\u043b\u044f \u043a\u0432\u0438\u0442\u0430\u043d\u0446\u0438\u0438',
    movedToTrashLog: '\u0417\u0430\u043a\u0430\u0437 \u043f\u0435\u0440\u0435\u043c\u0435\u0449\u0435\u043d \u0432 \u043a\u043e\u0440\u0437\u0438\u043d\u0443',
    restoredLog: '\u0417\u0430\u043a\u0430\u0437 \u0432\u043e\u0441\u0441\u0442\u0430\u043d\u043e\u0432\u043b\u0435\u043d \u0438\u0437 \u043a\u043e\u0440\u0437\u0438\u043d\u044b',
    cannotDeleteInvoice:
      '\u041d\u0435\u043b\u044c\u0437\u044f \u0443\u0434\u0430\u043b\u0438\u0442\u044c \u043d\u0430\u0432\u0441\u0435\u0433\u0434\u0430: \u0434\u043b\u044f \u044d\u0442\u043e\u0433\u043e \u0437\u0430\u043a\u0430\u0437\u0430 \u0443\u0436\u0435 \u0441\u043e\u0437\u0434\u0430\u043d\u0430 \u043a\u0432\u0438\u0442\u0430\u043d\u0446\u0438\u044f.',
    deleteBlockedByActivityLogs:
      '\u041d\u0430\u0432\u0441\u0435\u0433\u0434\u0430 \u0443\u0434\u0430\u043b\u0438\u0442\u044c \u0437\u0430\u043a\u0430\u0437 \u043f\u043e\u043a\u0430 \u043d\u0435\u043b\u044c\u0437\u044f: \u0441\u0442\u0430\u0440\u044b\u0435 \u0437\u0430\u043f\u0438\u0441\u0438 activity_logs \u0432 \u0431\u0430\u0437\u0435 \u0435\u0449\u0451 \u0436\u0451\u0441\u0442\u043a\u043e \u043f\u0440\u0438\u0432\u044f\u0437\u0430\u043d\u044b \u043a \u044d\u0442\u043e\u043c\u0443 \u0437\u0430\u043a\u0430\u0437\u0443. \u041f\u0440\u0438\u043c\u0435\u043d\u0438\u0442\u0435 SQL-\u0438\u0441\u043f\u0440\u0430\u0432\u043b\u0435\u043d\u0438\u0435 \u0434\u043b\u044f activity_logs \u0438 \u043f\u043e\u0432\u0442\u043e\u0440\u0438\u0442\u0435 \u043f\u043e\u043f\u044b\u0442\u043a\u0443.',
    moveToTrashFirst:
      '\u0421\u043d\u0430\u0447\u0430\u043b\u0430 \u043f\u0435\u0440\u0435\u043c\u0435\u0441\u0442\u0438\u0442\u0435 \u0437\u0430\u043a\u0430\u0437 \u0432 \u043a\u043e\u0440\u0437\u0438\u043d\u0443.',
    sumupTransactionMissing: '\u041e\u043f\u043b\u0430\u0442\u0430 SumUp \u043d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d\u0430',
    sumupAlreadyLinked: '\u042d\u0442\u0430 \u043e\u043f\u043b\u0430\u0442\u0430 SumUp \u0443\u0436\u0435 \u043f\u0440\u0438\u0432\u044f\u0437\u0430\u043d\u0430 \u043a \u0437\u0430\u043a\u0430\u0437\u0443',
    sumupLinkLogPrefix: '\u041e\u043f\u043b\u0430\u0442\u0430 SumUp \u043f\u0440\u0438\u0432\u044f\u0437\u0430\u043d\u0430',
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
    payment_provider: String(formData.get('payment_provider') ?? ''),
    paid_at: String(formData.get('paid_at') ?? ''),
  };
}

async function syncCustomServiceToCatalog(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  normalized: ReturnType<typeof normalizeOrderInput>
) {
  if (normalized.service_id || !normalized.custom_service_title) return;

  const { data: existingServices, error: existingServicesError } = await supabase
    .from('services')
    .select('id')
    .eq('user_id', userId)
    .ilike('title', normalized.custom_service_title)
    .limit(1);

  if (existingServicesError || (existingServices?.length ?? 0) > 0) return;

  await supabase.from('services').insert({
    user_id: userId,
    title: normalized.custom_service_title,
    default_price: normalized.custom_price,
    description: normalized.description,
  });
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
  await syncCustomServiceToCatalog(supabase, user.id, normalized);

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
        payment_provider: normalized.payment_provider,
        paid_at: normalized.paid_at,
      })
      .select('id')
      .single();

    if (error) {
      return { formError: prefixError(m.orderCreateError, error.message), values: raw };
    }

    revalidatePath('/orders');
    revalidatePath('/services');
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
      payment_provider: normalized.payment_provider,
      paid_at: normalized.paid_at,
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
  revalidatePath('/services');
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
    client_quick_name: _cqn,
    client_quick_phone: _cqp,
    client_quick_address: _cqa,
    client_quick_postal_code: _cqpc,
    client_quick_city: _cqc,
    ...updateData
  } = normalized;

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

export async function linkSumupTransactionAction(
  orderId: string,
  sumupTransactionId: string
): Promise<{ ok: boolean; error?: string }> {
  const locale = await getLocale();
  const m = getMessages(locale);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, error: m.unauthorized };

  const { data: order } = await supabase
    .from('orders')
    .select('id, user_id, invoice_number, invoice_locked_at, payment_method')
    .eq('id', orderId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!order) return { ok: false, error: m.orderNotFound };

  const { data: transaction, error: transactionError } = await supabase
    .from('sumup_transactions')
    .select('id, order_id, receipt_no, paid_at, transaction_code, sumup_transaction_id, amount')
    .eq('id', sumupTransactionId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (transactionError) return { ok: false, error: transactionError.message };
  if (!transaction) return { ok: false, error: m.sumupTransactionMissing };
  if (transaction.order_id && transaction.order_id !== orderId) {
    return { ok: false, error: m.sumupAlreadyLinked };
  }

  const { error: updateTransactionError } = await supabase
    .from('sumup_transactions')
    .update({ order_id: orderId })
    .eq('id', sumupTransactionId)
    .eq('user_id', user.id);

  if (updateTransactionError) return { ok: false, error: updateTransactionError.message };

  if (!order.invoice_number && !order.invoice_locked_at) {
    const paymentMethod = order.payment_method === 'cash' ? 'cash' : 'ec_card';
    const { error: updateOrderError } = await supabase
      .from('orders')
      .update({
        payment_method: paymentMethod,
        payment_provider: 'sumup',
        paid_at: transaction.paid_at,
        sumup_transaction_id: transaction.id,
        sumup_receipt_no: transaction.receipt_no,
      })
      .eq('id', orderId)
      .eq('user_id', user.id);

    if (updateOrderError) return { ok: false, error: updateOrderError.message };
  }

  await supabase.from('activity_logs').insert({
    order_id: orderId,
    user_id: user.id,
    action_type: 'sumup_payment_linked',
    action_text: `${m.sumupLinkLogPrefix}: ${
      transaction.receipt_no ?? transaction.transaction_code ?? transaction.sumup_transaction_id ?? transaction.id
    } (${transaction.amount})`,
  });

  revalidatePath(`/orders/${orderId}`);
  revalidatePath('/settings/sumup');
  return { ok: true };
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
      payment_provider: null,
      paid_at: null,
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

export async function restoreOrderAction(id: string): Promise<{ error: string } | void> {
  const locale = await getLocale();
  const m = getMessages(locale);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: m.unauthorized };

  const { error } = await supabase
    .from('orders')
    .update({ deleted_at: null })
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) return { error: error.message };

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

export async function permanentDeleteOrderAction(id: string): Promise<{ error: string } | void> {
  const locale = await getLocale();
  const m = getMessages(locale);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: m.unauthorized };

  const { data: order } = await supabase
    .from('orders')
    .select('invoice_number, deleted_at')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!order) return { error: m.orderNotFound };
  if (order.invoice_number) return { error: m.cannotDeleteInvoice };
  if (!order.deleted_at) return { error: m.moveToTrashFirst };

  const { data: photos } = await supabase.from('order_photos').select('file_path').eq('order_id', id);

  if (photos && photos.length > 0) {
    const { error: photosStorageError } = await supabase.storage
      .from('order-photos')
      .remove(photos.map((p) => p.file_path));
    if (photosStorageError) return { error: photosStorageError.message };
  }

  const { data: fullOrder } = await supabase
    .from('orders')
    .select('signature_file_path, pdf_file_path')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (fullOrder?.signature_file_path) {
    const { error: signatureStorageError } = await supabase.storage
      .from('order-signatures')
      .remove([fullOrder.signature_file_path]);
    if (signatureStorageError) return { error: signatureStorageError.message };
  }
  if (fullOrder?.pdf_file_path) {
    const { error: pdfStorageError } = await supabase.storage
      .from('order-pdfs')
      .remove([fullOrder.pdf_file_path]);
    if (pdfStorageError) return { error: pdfStorageError.message };
  }

  const { error } = await supabase.from('orders').delete().eq('id', id).eq('user_id', user.id);

  if (error) {
    if (error.message.toLowerCase().includes('activity_logs are append-only')) {
      return { error: m.deleteBlockedByActivityLogs };
    }

    return { error: error.message };
  }

  revalidatePath('/orders');
  revalidatePath('/orders/trash');
  redirect('/orders/trash');
}
