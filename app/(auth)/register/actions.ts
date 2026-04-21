'use server';

import { redirect } from 'next/navigation';
import { validateCsrfFormData } from '@/lib/csrf/server';
import { createClient } from '@/lib/supabase/server';
import {
  normalizeRegisterInput,
  validateRegister,
  type RegisterValidationErrors,
} from '@/lib/validators/auth';

export type RegisterFormState = {
  errors?: RegisterValidationErrors;
  formError?: string;
  values?: {
    email: string;
  };
};

export async function registerAction(
  _prevState: RegisterFormState,
  formData: FormData
): Promise<RegisterFormState> {
  try {
    await validateCsrfFormData(formData);
  } catch {
    return { formError: 'CSRF validation failed' };
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

  const { error } = await supabase.auth.signUp({
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

  redirect('/dashboard');
}
