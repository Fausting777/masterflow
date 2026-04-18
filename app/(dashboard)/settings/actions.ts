'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export type ProfileFormState = {
  formError?: string;
  success?: boolean;
  values?: {
    full_name: string;
    phone: string;
    company_name: string;
  };
};

export async function updateProfileAction(
  _prevState: ProfileFormState,
  formData: FormData
): Promise<ProfileFormState> {
  const raw = {
    full_name: String(formData.get('full_name') ?? '').trim(),
    phone: String(formData.get('phone') ?? '').trim(),
    company_name: String(formData.get('company_name') ?? '').trim(),
  };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { formError: 'Не авторизован', values: raw };

  const { error } = await supabase
    .from('profiles')
    .update({
      full_name: raw.full_name || null,
      phone: raw.phone || null,
      company_name: raw.company_name || null,
    })
    .eq('id', user.id);

  if (error) return { formError: error.message, values: raw };

  revalidatePath('/settings');
  return { success: true, values: raw };
}