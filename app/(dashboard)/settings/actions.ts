'use server';

import { validateCsrfFormData } from '@/lib/csrf/server';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import {
  validatePasswordChange,
  type PasswordChangeValidationErrors,
} from '@/lib/validators/auth';

export type ProfileFormValues = {
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
  bic: string;
  bank_name: string;
  business_email: string;
};

export type ProfileFormState = {
  formError?: string;
  success?: boolean;
  values?: ProfileFormValues;
};

function getInvoiceProfileMissing(raw: ProfileFormValues) {
  const missing: string[] = [];

  if (!raw.full_name) missing.push('Name');
  if (!raw.address) missing.push('Adresse');
  if (!raw.postal_code) missing.push('PLZ');
  if (!raw.city) missing.push('Ort');
  if (!raw.tax_number && !raw.vat_id) missing.push('Steuernummer / USt-IdNr.');

  return missing;
}

export async function updateProfileAction(
  _prevState: ProfileFormState,
  formData: FormData
): Promise<ProfileFormState> {
  try {
    await validateCsrfFormData(formData);
  } catch {
    return { formError: 'CSRF validation failed' };
  }

  const raw: ProfileFormValues = {
    full_name: String(formData.get('full_name') ?? '').trim(),
    phone: String(formData.get('phone') ?? '').trim(),
    company_name: String(formData.get('company_name') ?? '').trim(),
    address: String(formData.get('address') ?? '').trim(),
    postal_code: String(formData.get('postal_code') ?? '').trim(),
    city: String(formData.get('city') ?? '').trim(),
    tax_number: String(formData.get('tax_number') ?? '').trim(),
    vat_id: String(formData.get('vat_id') ?? '').trim(),
    business_email: String(formData.get('business_email') ?? '').trim(),
    is_kleinunternehmer: formData.get('is_kleinunternehmer') === 'on',
    iban: String(formData.get('iban') ?? '').trim().replace(/\s+/g, ' '),
    bic: String(formData.get('bic') ?? '')
      .trim()
      .replace(/\s+/g, ' ')
      .toUpperCase(),
    bank_name: String(formData.get('bank_name') ?? '').trim(),
  };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { formError: 'Not authorized', values: raw };
  }

  const missing = getInvoiceProfileMissing(raw);
  if (missing.length > 0) {
    return {
      formError: `Bitte vervollständigen Sie die Pflichtangaben für Rechnungen: ${missing.join(', ')}`,
      values: raw,
    };
  }

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
      business_email: raw.business_email || null,
      is_kleinunternehmer: raw.is_kleinunternehmer,
      iban: raw.iban || null,
      bic: raw.bic || null,
      bank_name: raw.bank_name || null,
    })
    .eq('id', user.id);

  if (error) return { formError: error.message, values: raw };

  revalidatePath('/settings');
  return { success: true, values: raw };
}

export type PasswordChangeState = {
  formError?: string;
  errors?: PasswordChangeValidationErrors;
  success?: boolean;
};

export async function changePasswordAction(
  _prevState: PasswordChangeState,
  formData: FormData
): Promise<PasswordChangeState> {
  try {
    await validateCsrfFormData(formData);
  } catch {
    return { formError: 'CSRF validation failed' };
  }

  const currentPassword = String(formData.get('currentPassword') ?? '');
  const newPassword = String(formData.get('newPassword') ?? '');
  const confirmPassword = String(formData.get('confirmPassword') ?? '');

  const errors = validatePasswordChange({
    currentPassword,
    newPassword,
    confirmPassword,
  });

  if (Object.keys(errors).length > 0) {
    return { errors };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !user.email) {
    return { formError: 'Not authorized' };
  }

  const { error: updateError } = await supabase.auth.updateUser({
    password: newPassword,
    current_password: currentPassword,
  });

  if (updateError) {
    const msg = updateError.message.toLowerCase();
    if (msg.includes('invalid') || msg.includes('incorrect') || msg.includes('wrong')) {
      return {
        errors: { currentPassword: 'Current password is incorrect' },
      };
    }
    return { formError: `Error: ${updateError.message}` };
  }

  return { success: true };
}
