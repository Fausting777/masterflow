import LoginForm from '@/components/forms/LoginForm';
import { getDictionary } from '@/lib/i18n/server';

export default async function LoginPage() {
  const { t } = await getDictionary();

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">{t.auth.loginTitle}</h2>
      <LoginForm />
    </div>
  );
}
