import PasswordChangeForm from '@/components/forms/PasswordChangeForm';
import { createClient } from '@/lib/supabase/server';
import ProfileForm from '@/components/forms/ProfileForm';

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user!.id)
    .single();

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-semibold mb-1">Настройки</h1>
      <p className="text-sm text-neutral-500 mb-6">
        Данные, которые попадут в PDF-счета
      </p>

      <div className="bg-white border border-neutral-200 rounded-xl p-5">
        <ProfileForm
          initial={{
            full_name: profile?.full_name ?? null,
            phone: profile?.phone ?? null,
            company_name: profile?.company_name ?? null,
            address: profile?.address ?? null,
            postal_code: profile?.postal_code ?? null,
            city: profile?.city ?? null,
            tax_number: profile?.tax_number ?? null,
            vat_id: profile?.vat_id ?? null,
            is_kleinunternehmer: profile?.is_kleinunternehmer ?? true,
            iban: profile?.iban ?? null,
            bank_name: profile?.bank_name ?? null,
            business_email: profile?.business_email ?? null,    // ← новое
          }}
        />
      </div>
      {/* Блок безопасности */}
<h2 className="text-lg font-semibold mt-8 mb-3">Безопасность</h2>
<div className="bg-white border border-neutral-200 rounded-xl p-5 max-w-md">
  <p className="text-sm text-neutral-600 mb-4">
    Смена пароля для входа в MasterFlow. После смены вы останетесь залогинены.
  </p>
  <PasswordChangeForm />
</div>

      <div className="mt-4 p-4 rounded-lg bg-neutral-100 text-xs text-neutral-600">
        <strong>Email:</strong> {user!.email}
      </div>
    </div>
  );
}