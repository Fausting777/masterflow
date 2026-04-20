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
    business_email: string;         // ← новое
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
// ==================================================================
// СМЕНА ПАРОЛЯ
// ==================================================================

export type PasswordChangeState = {
  formError?: string;
  errors?: {
    currentPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
  };
  success?: boolean;
};

export async function changePasswordAction(
  _prevState: PasswordChangeState,
  formData: FormData
): Promise<PasswordChangeState> {
  const currentPassword = String(formData.get('currentPassword') ?? '');
  const newPassword = String(formData.get('newPassword') ?? '');
  const confirmPassword = String(formData.get('confirmPassword') ?? '');

  // Базовая валидация
  const errors: PasswordChangeState['errors'] = {};

  if (!currentPassword) {
    errors.currentPassword = 'Укажите текущий пароль';
  }

  if (!newPassword) {
    errors.newPassword = 'Укажите новый пароль';
  } else if (newPassword.length < 8) {
    errors.newPassword = 'Минимум 8 символов';
  } else if (newPassword.length > 72) {
    errors.newPassword = 'Максимум 72 символа';
  }

  if (newPassword && newPassword !== confirmPassword) {
    errors.confirmPassword = 'Пароли не совпадают';
  }

  if (newPassword && currentPassword && newPassword === currentPassword) {
    errors.newPassword = 'Новый пароль должен отличаться от текущего';
  }

  if (Object.keys(errors).length > 0) {
    return { errors };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !user.email) {
    return { formError: 'Не авторизован' };
  }

  // Меняем пароль — Supabase сам проверит текущий
const { error: updateError } = await supabase.auth.updateUser({
  password: newPassword,
  // @ts-expect-error — current_password поддерживается Supabase, но нет в типах supabase-js
  current_password: currentPassword,
});

if (updateError) {
  // Определяем тип ошибки по сообщению
  const msg = updateError.message.toLowerCase();
  if (msg.includes('invalid') || msg.includes('incorrect') || msg.includes('wrong')) {
    return {
      errors: { currentPassword: 'Неверный текущий пароль' },
    };
  }
  return { formError: `Ошибка: ${updateError.message}` };
}

return { success: true };
}