'use client';

import { useI18n } from '@/components/i18n/LocaleProvider';
import {
  getPasswordPolicyErrors,
  PASSWORD_POLICY,
} from '@/lib/validators/auth';

type Props = {
  password: string;
  intro: string;
};

const LETTER_RE = /[A-Za-zА-Яа-яЁё]/;

export default function PasswordPolicyHint({ password, intro }: Props) {
  const { t } = useI18n();
  const passwordPolicyErrors = getPasswordPolicyErrors(password);

  return (
    <div className="mt-2 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs text-neutral-600">
      <p>{intro}</p>
      <ul className="mt-1 space-y-1">
        <li className={password.length >= PASSWORD_POLICY.minLength ? 'text-green-700' : ''}>
          {t.password.minLength}
        </li>
        <li className={LETTER_RE.test(password) ? 'text-green-700' : ''}>
          {t.password.hasLetter}
        </li>
      </ul>
      {password.length > 0 && passwordPolicyErrors.length > 0 && (
        <p className="mt-2 text-red-600">{passwordPolicyErrors[0]}</p>
      )}
    </div>
  );
}
