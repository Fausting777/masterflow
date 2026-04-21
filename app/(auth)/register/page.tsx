import RegisterForm from '@/components/forms/RegisterForm';
import { getDictionary } from '@/lib/i18n/server';

export default async function RegisterPage() {
  const { t } = await getDictionary();

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">{t.auth.registerTitle}</h2>
      <RegisterForm />
    </div>
  );
}
