'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { validateCsrfFormData, validateCsrfCookie } from '@/lib/csrf/server';
import { getLocale } from '@/lib/i18n/server';
import { createClient } from '@/lib/supabase/server';
import {
  normalizeServiceInput,
  validateService,
  type ServiceValidationErrors,
} from '@/lib/validators/service';

export type ServiceFormState = {
  errors?: ServiceValidationErrors;
  formError?: string;
  values?: {
    title: string;
    default_price: string;
    description: string;
  };
};

function getTexts(locale: 'ru' | 'de') {
  if (locale === 'de') {
    return {
      csrfError: 'CSRF-Prüfung fehlgeschlagen',
      unauthorized: 'Nicht autorisiert',
      genericError: 'Fehler',
      deleteError: 'Fehler beim Löschen',
    };
  }

  return {
    csrfError: 'Проверка CSRF не пройдена',
    unauthorized: 'Нет авторизации',
    genericError: 'Ошибка',
    deleteError: 'Ошибка удаления',
  };
}

export async function createServiceAction(
  _prevState: ServiceFormState,
  formData: FormData
): Promise<ServiceFormState> {
  const locale = await getLocale();
  const text = getTexts(locale);

  try {
    await validateCsrfFormData(formData);
  } catch {
    return { formError: text.csrfError };
  }

  const raw = {
    title: String(formData.get('title') ?? ''),
    default_price: String(formData.get('default_price') ?? ''),
    description: String(formData.get('description') ?? ''),
  };

  const errors = validateService(raw);
  if (Object.keys(errors).length > 0) return { errors, values: raw };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { formError: text.unauthorized, values: raw };

  const normalized = normalizeServiceInput(raw);
  const { error } = await supabase.from('services').insert({
    user_id: user.id,
    ...normalized,
  });

  if (error) return { formError: `${text.genericError}: ${error.message}`, values: raw };

  revalidatePath('/services');
  redirect('/services');
}

export async function updateServiceAction(
  id: string,
  _prevState: ServiceFormState,
  formData: FormData
): Promise<ServiceFormState> {
  const locale = await getLocale();
  const text = getTexts(locale);

  try {
    await validateCsrfFormData(formData);
  } catch {
    return { formError: text.csrfError };
  }

  const raw = {
    title: String(formData.get('title') ?? ''),
    default_price: String(formData.get('default_price') ?? ''),
    description: String(formData.get('description') ?? ''),
  };

  const errors = validateService(raw);
  if (Object.keys(errors).length > 0) return { errors, values: raw };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { formError: text.unauthorized, values: raw };

  const normalized = normalizeServiceInput(raw);
  const { error } = await supabase
    .from('services')
    .update(normalized)
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) return { formError: `${text.genericError}: ${error.message}`, values: raw };

  revalidatePath('/services');
  revalidatePath(`/services/${id}`);
  redirect(`/services/${id}`);
}

export async function deleteServiceAction(id: string): Promise<{ ok: boolean; error?: string }> {
  const locale = await getLocale();
  const text = getTexts(locale);
  try { await validateCsrfCookie(); } catch { return { ok: false, error: text.csrfError }; }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, error: text.unauthorized };

  const { error } = await supabase.from('services').delete().eq('id', id).eq('user_id', user.id);

  if (error) return { ok: false, error: `${text.deleteError}: ${error.message}` };

  revalidatePath('/services');
  redirect('/services');
}
