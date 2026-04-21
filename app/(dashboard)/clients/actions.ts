'use server';

import { validateCsrfFormData } from '@/lib/csrf/server';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import {
  validateClient,
  normalizeClientInput,
  type ClientValidationErrors,
} from '@/lib/validators/client';

// Тип результата: либо ошибки валидации, либо общая ошибка
export type ClientFormState = {
  errors?: ClientValidationErrors;
  formError?: string;
 values?: {
  full_name: string;
  phone: string;
  email: string;        // ← новое
  address: string;
  postal_code: string;    // ← новое
  city: string;           // ← новое
  note: string;
};
};

// -----------------------------------------------
// CREATE
// -----------------------------------------------
export async function createClientAction(
  _prevState: ClientFormState,
  formData: FormData
): Promise<ClientFormState> {
  try {
    await validateCsrfFormData(formData);
  } catch {
    return { formError: 'CSRF validation failed' };
  }

  const raw = {
    full_name: String(formData.get('full_name') ?? ''),
    phone: String(formData.get('phone') ?? ''),
    email: String(formData.get('email') ?? ''),
    address: String(formData.get('address') ?? ''),
    postal_code: String(formData.get('postal_code') ?? ''),   // ← новое
  city: String(formData.get('city') ?? ''),                  // ← новое
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
    return { formError: 'Не авторизован', values: raw };
  }

  const normalized = normalizeClientInput(raw);

  const { error } = await supabase.from('clients').insert({
    user_id: user.id,
    ...normalized,
  });

  if (error) {
    return { formError: `Ошибка сохранения: ${error.message}`, values: raw };
  }

  revalidatePath('/clients');
  redirect('/clients');
}

// -----------------------------------------------
// UPDATE
// -----------------------------------------------
export async function updateClientAction(
  id: string,
  _prevState: ClientFormState,
  formData: FormData
): Promise<ClientFormState> {
  try {
    await validateCsrfFormData(formData);
  } catch {
    return { formError: 'CSRF validation failed' };
  }

  const raw = {
    full_name: String(formData.get('full_name') ?? ''),
    phone: String(formData.get('phone') ?? ''),
    email: String(formData.get('email') ?? ''),
    address: String(formData.get('address') ?? ''),
    postal_code: String(formData.get('postal_code') ?? ''),   // ← новое
  city: String(formData.get('city') ?? ''),                  // ← новое
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
    return { formError: 'Не авторизован', values: raw };
  }

  const normalized = normalizeClientInput(raw);

  const { error } = await supabase
    .from('clients')
    .update(normalized)
    .eq('id', id)
    .eq('user_id', user.id); // дополнительная страховка, хотя RLS тоже режет

  if (error) {
    return { formError: `Ошибка сохранения: ${error.message}`, values: raw };
  }

  revalidatePath('/clients');
  revalidatePath(`/clients/${id}`);
  redirect(`/clients/${id}`);
}

// -----------------------------------------------
// DELETE
// -----------------------------------------------
export async function deleteClientAction(id: string): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Не авторизован');

  // Проверяем, есть ли у клиента активные (не удалённые) заказы
  const { count } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .eq('client_id', id)
    .eq('user_id', user.id)
    .is('deleted_at', null);

  if (count && count > 0) {
    throw new Error(`Нельзя удалить: у клиента ${count} активных заказов`);
  }

  const { error } = await supabase
    .from('clients')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    throw new Error(
      error.message.includes('foreign key')
        ? 'Нельзя удалить: у клиента есть заказы в корзине с квитанциями'
        : `Ошибка удаления: ${error.message}`
    );
  }

  revalidatePath('/clients');
  redirect('/clients');
}
