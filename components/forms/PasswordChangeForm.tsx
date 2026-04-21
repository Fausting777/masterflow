'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import {
  changePasswordAction,
  type PasswordChangeState,
} from '@/app/(dashboard)/settings/actions';
import CsrfTokenInput from '@/components/security/CsrfTokenInput';
import PasswordPolicyHint from '@/components/forms/PasswordPolicyHint';
import { useI18n } from '@/components/i18n/LocaleProvider';
import { PASSWORD_POLICY } from '@/lib/validators/auth';

export default function PasswordChangeForm() {
  const [state, formAction, isPending] = useActionState<PasswordChangeState, FormData>(
    changePasswordAction,
    {}
  );
  const formRef = useRef<HTMLFormElement>(null);
  const { t } = useI18n();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    if (state.success && formRef.current) {
      formRef.current.reset();
      setNewPassword('');
      setConfirmPassword('');
    }
  }, [state.success]);

  const passwordsMatch = confirmPassword.length > 0 && newPassword === confirmPassword;

  const inputCls =
    'w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <CsrfTokenInput />

      <div>
        <label htmlFor="currentPassword" className="block text-sm font-medium mb-1">
          {t.password.current} <span className="text-red-500">*</span>
        </label>
        <input
          id="currentPassword"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
          className={inputCls}
        />
        {state.errors?.currentPassword && (
          <p className="mt-1 text-xs text-red-600">{state.errors.currentPassword}</p>
        )}
      </div>

      <div>
        <label htmlFor="newPassword" className="block text-sm font-medium mb-1">
          {t.password.new} <span className="text-red-500">*</span>
        </label>
        <input
          id="newPassword"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={PASSWORD_POLICY.minLength}
          maxLength={PASSWORD_POLICY.maxLength}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className={inputCls}
        />
        {state.errors?.newPassword && (
          <p className="mt-1 text-xs text-red-600">{state.errors.newPassword}</p>
        )}
        <PasswordPolicyHint password={newPassword} intro={t.password.newPolicyIntro} />
      </div>

      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-medium mb-1">
          {t.password.confirmNew} <span className="text-red-500">*</span>
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className={inputCls}
        />
        {confirmPassword.length > 0 && !passwordsMatch && (
          <p className="mt-1 text-xs text-red-600">{t.password.mismatch}</p>
        )}
        {state.errors?.confirmPassword && (
          <p className="mt-1 text-xs text-red-600">{state.errors.confirmPassword}</p>
        )}
      </div>

      {state.formError && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
          {state.formError}
        </div>
      )}

      {state.success && (
        <div className="rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-700">
          {t.password.changed}
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2.5 text-sm transition"
      >
        {isPending ? t.password.changing : t.password.change}
      </button>
    </form>
  );
}
