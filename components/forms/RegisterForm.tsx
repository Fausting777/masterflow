'use client';

import { useActionState, useState } from 'react';
import Link from 'next/link';
import CsrfTokenInput from '@/components/security/CsrfTokenInput';
import PasswordPolicyHint from '@/components/forms/PasswordPolicyHint';
import { useI18n } from '@/components/i18n/LocaleProvider';
import { registerAction, type RegisterFormState } from '@/app/(auth)/register/actions';
import { PASSWORD_POLICY } from '@/lib/validators/auth';

export default function RegisterForm() {
  const [state, formAction, isPending] = useActionState<RegisterFormState, FormData>(
    registerAction,
    {}
  );
  const { t } = useI18n();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;

  return (
    <form action={formAction} className="space-y-4">
      <CsrfTokenInput />

      <div>
        <label htmlFor="email" className="block text-sm font-medium mb-1">
          {t.auth.email}
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          defaultValue={state.values?.email ?? ''}
          className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {state.errors?.email && (
          <p className="mt-1 text-xs text-red-600">{state.errors.email}</p>
        )}
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium mb-1">
          {t.auth.password}
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={PASSWORD_POLICY.minLength}
          maxLength={PASSWORD_POLICY.maxLength}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {state.errors?.password && (
          <p className="mt-1 text-xs text-red-600">{state.errors.password}</p>
        )}
        <PasswordPolicyHint password={password} intro={t.password.policyIntro} />
      </div>

      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-medium mb-1">
          {t.auth.confirmPassword}
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {confirmPassword.length > 0 && !passwordsMatch && (
          <p className="mt-1 text-xs text-red-600">{t.password.mismatch}</p>
        )}
        {state.errors?.confirmPassword && (
          <p className="mt-1 text-xs text-red-600">{state.errors.confirmPassword}</p>
        )}
      </div>

      {state.formError && (
        <div className="rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 px-3 py-2 text-sm text-red-700 dark:text-red-300">
          {state.formError}
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2.5 text-sm transition"
      >
        {isPending ? t.auth.registering : t.auth.createAccount}
      </button>

      <p className="text-sm text-center text-neutral-600 dark:text-neutral-400">
        {t.auth.haveAccount}{' '}
        <Link href="/login" className="text-blue-600 hover:underline">
          {t.auth.loginLink}
        </Link>
      </p>
    </form>
  );
}
