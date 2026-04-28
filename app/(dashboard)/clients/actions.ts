'use server';

import { validateCsrfFormData, validateCsrfCookie } from '@/lib/csrf/server';
import { getLocale } from '@/lib/i18n/server';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import {
  validateClient,
  normalizeClientInput,
  type ClientValidationErrors,
} from '@/lib/validators/client';

export type ClientFormState = {
  errors?: ClientValidationErrors;
  formError?: string;
  values?: {
    full_name: string;
    phone: string;
    email: string;
    address: string;
    postal_code: string;
    city: string;
    note: string;
  };
};

async function getMessages() {
  const locale = await getLocale();
  return locale === 'de'
    ? {
        csrfFailed: 'CSRF-Prüfung fehlgeschlagen',
        unauthorized: 'Nicht autorisiert',
        saveError: 'Fehler beim Speichern',
        deleteError: 'Fehler beim Löschen',
        hasActiveOrders: (count: number) => `Löschen nicht möglich: Kunde hat ${count} aktive Aufträge`,
        hasOrdersWithInvoice: 'Löschen nicht möglich: Kunde hat Aufträge mit Rechnungen',
      }
    : {
        csrfFailed: 'Проверка CSRF не пройдена',
        unauthorized: 'Нет авторизации',
        saveError: 'Ошибка сохранения',
        deleteError: 'Ошибка удаления',
        hasActiveOrders: (count: number) => `Нельзя удалить: у клиента ${count} активных заказов`,
        hasOrdersWithInvoice: 'Нельзя удалить: у клиента есть заказы в корзине со счетами',
      };
}

export async function createClientAction(
  _prevState: ClientFormState,
  formData: FormData
): Promise<ClientFormState> {
  const m = await getMessages();

  try {
    await validateCsrfFormData(formData);
  } catch {
    return { formError: m.csrfFailed };
  }

  const raw = {
    full_name: String(formData.get('full_name') ?? ''),
    phone: String(formData.get('phone') ?? ''),
    email: String(formData.get('email') ?? ''),
    address: String(formData.get('address') ?? ''),
    postal_code: String(formData.get('postal_code') ?? ''),
    city: String(formData.get('city') ?? ''),
    note: String(formData.get('note') ?? ''),
  };

  const errors = validateClient(raw);
  if (Object.keys(errors).length > 0) {
    return { errors, values: raw };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { formError: m.unauthorized, values: raw };
  }

  const normalized = normalizeClientInput(raw);

  const { error } = await supabase.from('clients').insert({
    user_id: user.id,
    ...normalized,
  });

  if (error) {
    return { formError: `${m.saveError}: ${error.message}`, values: raw };
  }

  revalidatePath('/clients');
  redirect('/clients');
}

export async function updateClientAction(
  id: string,
  _prevState: ClientFormState,
  formData: FormData
): Promise<ClientFormState> {
  const m = await getMessages();

  try {
    await validateCsrfFormData(formData);
  } catch {
    return { formError: m.csrfFailed };
  }

  const raw = {
    full_name: String(formData.get('full_name') ?? ''),
    phone: String(formData.get('phone') ?? ''),
    email: String(formData.get('email') ?? ''),
    address: String(formData.get('address') ?? ''),
    postal_code: String(formData.get('postal_code') ?? ''),
    city: String(formData.get('city') ?? ''),
    note: String(formData.get('note') ?? ''),
  };

  const errors = validateClient(raw);
  if (Object.keys(errors).length > 0) {
    return { errors, values: raw };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { formError: m.unauthorized, values: raw };
  }

  const normalized = normalizeClientInput(raw);

  const { error } = await supabase
    .from('clients')
    .update(normalized)
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    return { formError: `${m.saveError}: ${error.message}`, values: raw };
  }

  revalidatePath('/clients');
  revalidatePath(`/clients/${id}`);
  redirect(`/clients/${id}`);
}

export async function deleteClientAction(id: string): Promise<{ ok: boolean; error?: string }> {
  const m = await getMessages();
  try { await validateCsrfCookie(); } catch { return { ok: false, error: m.csrfFailed }; }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: m.unauthorized };

  const { count } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .eq('client_id', id)
    .eq('user_id', user.id)
    .is('deleted_at', null);

  if (count && count > 0) {
    return { ok: false, error: m.hasActiveOrders(count) };
  }

  const { error } = await supabase
    .from('clients')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    return {
      ok: false,
      error: error.message.includes('foreign key')
        ? m.hasOrdersWithInvoice
        : `${m.deleteError}: ${error.message}`,
    };
  }

  revalidatePath('/clients');
  redirect('/clients');
}
