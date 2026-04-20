'use client';

import { useActionState, useRef, useEffect } from 'react';
import {
  changePasswordAction,
  type PasswordChangeState,
} from '@/app/(dashboard)/settings/actions';

export default function PasswordChangeForm() {
  const [state, formAction, isPending] = useActionState<PasswordChangeState, FormData>(
    changePasswordAction,
    {}
  );
  const formRef = useRef<HTMLFormElement>(null);

  // Чистим форму после успеха
  useEffect(() => {
    if (state.success && formRef.current) {
      formRef.current.reset();
    }
  }, [state.success]);

  const inputCls =
    'w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <div>
        <label htmlFor="currentPassword" className="block text-sm font-medium mb-1">
          Текущий пароль <span className="text-red-500">*</span>
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
          <p className="text-xs text-red-600 mt-1">{state.errors.currentPassword}</p>
        )}
      </div>

      <div>
        <label htmlFor="newPassword" className="block text-sm font-medium mb-1">
          Новый пароль <span className="text-red-500">*</span>
        </label>
        <input
          id="newPassword"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className={inputCls}
        />
        <p className="text-xs text-neutral-500 mt-1">Минимум 8 символов</p>
        {state.errors?.newPassword && (
          <p className="text-xs text-red-600 mt-1">{state.errors.newPassword}</p>
        )}
      </div>

      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-medium mb-1">
          Повторите новый пароль <span className="text-red-500">*</span>
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          className={inputCls}
        />
        {state.errors?.confirmPassword && (
          <p className="text-xs text-red-600 mt-1">{state.errors.confirmPassword}</p>
        )}
      </div>

      {state.formError && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
          {state.formError}
        </div>
      )}

      {state.success && (
        <div className="rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-700">
          ✓ Пароль успешно изменён
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2.5 text-sm transition"
      >
        {isPending ? 'Изменяем...' : 'Изменить пароль'}
      </button>
    </form>
  );
}