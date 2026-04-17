'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import {
  validateService,
  normalizeServiceInput,
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

export async function createServiceAction(
  _prevState: ServiceFormState,
  formData: FormData
): Promise<ServiceFormState> {
  const raw = {
    title: String(formData.get('title') ?? ''),
    default_price: String(formData.get('default_price') ?? ''),
    description: String(formData.get('description') ?? ''),
  };

  const errors = validateService(raw);
  if (Object.keys(errors).length > 0) return { errors, values: raw };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { formError: 'Не авторизован', values: raw };

  const normalized = normalizeServiceInput(raw);
  const { error } = await supabase.from('services').insert({
    user_id: user.id,
    ...normalized,
  });

  if (error) return { formError: `Ошибка: ${error.message}`, values: raw };

  revalidatePath('/services');
  redirect('/services');
}

export async function updateServiceAction(
  id: string,
  _prevState: ServiceFormState,
  formData: FormData
): Promise<ServiceFormState> {
  const raw = {
    title: String(formData.get('title') ?? ''),
    default_price: String(formData.get('default_price') ?? ''),
    description: String(formData.get('description') ?? ''),
  };

  const errors = validateService(raw);
  if (Object.keys(errors).length > 0) return { errors, values: raw };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { formError: 'Не авторизован', values: raw };

  const normalized = normalizeServiceInput(raw);
  const { error } = await supabase
    .from('services')
    .update(normalized)
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) return { formError: `Ошибка: ${error.message}`, values: raw };

  revalidatePath('/services');
  revalidatePath(`/services/${id}`);
  redirect(`/services/${id}`);
}

export async function deleteServiceAction(id: string): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Не авторизован');

  const { error } = await supabase
    .from('services')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) throw new Error(`Ошибка удаления: ${error.message}`);

  revalidatePath('/services');
  redirect('/services');
}