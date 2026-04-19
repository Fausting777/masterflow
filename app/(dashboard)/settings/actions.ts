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
    address: string;
    postal_code: string;
    city: string;
    tax_number: string;
    vat_id: string;
    is_kleinunternehmer: boolean;
    iban: string;
    bank_name: string;
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
    address: String(formData.get('address') ?? '').trim(),
    postal_code: String(formData.get('postal_code') ?? '').trim(),
    city: String(formData.get('city') ?? '').trim(),
    tax_number: String(formData.get('tax_number') ?? '').trim(),
    vat_id: String(formData.get('vat_id') ?? '').trim(),
    business_email: String(formData.get('business_email') ?? ''),
    is_kleinunternehmer: formData.get('is_kleinunternehmer') === 'on',
    iban: String(formData.get('iban') ?? '').trim().replace(/\s+/g, ' '),
    bank_name: String(formData.get('bank_name') ?? '').trim(),
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
      address: raw.address || null,
      postal_code: raw.postal_code || null,
      city: raw.city || null,
      tax_number: raw.tax_number || null,
      vat_id: raw.vat_id || null,
      is_kleinunternehmer: raw.is_kleinunternehmer,
      iban: raw.iban || null,
      bank_name: raw.bank_name || null,
      business_email: raw.business_email?.trim() || null,
    })
    .eq('id', user.id);

  if (error) return { formError: error.message, values: raw };

  
  revalidatePath('/settings');
  return { success: true, values: raw };
}