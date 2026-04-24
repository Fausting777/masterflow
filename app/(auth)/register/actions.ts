'use server';

import { redirect } from 'next/navigation';
import { validateCsrfFormData } from '@/lib/csrf/server';
import { getLocale } from '@/lib/i18n/server';
import { createClient } from '@/lib/supabase/server';
import {
  normalizeRegisterInput,
  validateRegister,
  type RegisterValidationErrors,
} from '@/lib/validators/auth';

export type RegisterFormState = {
  errors?: RegisterValidationErrors;
  formError?: string;
  successMessage?: string;
  values?: {
    email: string;
  };
};

export async function registerAction(
  _prevState: RegisterFormState,
  formData: FormData
): Promise<RegisterFormState> {
  const locale = await getLocale();
  const text =
    locale === 'de'
      ? {
          csrfFailed: 'CSRF-Validierung fehlgeschlagen',
          confirmEmail:
            'Konto erstellt. Bitte bestaetige jetzt deine E-Mail-Adresse und melde dich danach an.',
        }
      : {
          csrfFailed: 'Ошибка проверки CSRF',
          confirmEmail:
            'Аккаунт создан. Подтверди email и затем войди в систему.',
        };

  try {
    await validateCsrfFormData(formData);
  } catch {
    return { formError: text.csrfFailed };
  }

  const raw = {
    email: String(formData.get('email') ?? ''),
    password: String(formData.get('password') ?? ''),
    confirmPassword: String(formData.get('confirmPassword') ?? ''),
  };

  const errors = validateRegister(raw);
  if (Object.keys(errors).length > 0) {
    return {
      errors,
      values: {
        email: raw.email,
      },
    };
  }

  const supabase = await createClient();
  const normalized = normalizeRegisterInput(raw);

  const { data, error } = await supabase.auth.signUp({
    email: normalized.email,
    password: normalized.password,
  });

  if (error) {
    return {
      formError: error.message,
      values: {
        email: raw.email,
      },
    };
  }

  if (data.session) {
    redirect('/dashboard');
  }

  return {
    successMessage: text.confirmEmail,
    values: {
      email: raw.email,
    },
  };
}
