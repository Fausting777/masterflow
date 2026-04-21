import PasswordChangeForm from '@/components/forms/PasswordChangeForm';
import LanguageSwitcher from '@/components/i18n/LanguageSwitcher';
import { createClient } from '@/lib/supabase/server';
import { getDictionary } from '@/lib/i18n/server';
import ProfileForm from '@/components/forms/ProfileForm';

export default async function SettingsPage() {
  const { t } = await getDictionary();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user!.id)
    .single();

  return (
    <div className="max-w-lg">
      <h1 className="mb-1 text-2xl font-semibold">{t.settings.title}</h1>
      <p className="mb-6 text-sm text-neutral-500">{t.settings.subtitle}</p>

      <div className="mb-6 rounded-xl border border-neutral-200 bg-white p-5">
        <div className="mb-3">
          <h2 className="text-base font-semibold">{t.settings.languageTitle}</h2>
          <p className="mt-1 text-sm text-neutral-500">{t.settings.languageText}</p>
        </div>
        <LanguageSwitcher />
      </div>

      <div className="rounded-xl border border-neutral-200 bg-white p-5">
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
            bic: profile?.bic ?? null,
            bank_name: profile?.bank_name ?? null,
            business_email: profile?.business_email ?? null,
          }}
        />
      </div>

      <h2 className="mb-3 mt-8 text-lg font-semibold">{t.settings.securityTitle}</h2>
      <div className="max-w-md rounded-xl border border-neutral-200 bg-white p-5">
        <p className="mb-4 text-sm text-neutral-600">
          {t.settings.securityText}
        </p>
        <PasswordChangeForm />
      </div>

      <div className="mt-4 rounded-lg bg-neutral-100 p-4 text-xs text-neutral-600">
        <strong>{t.settings.emailLabel}:</strong> {user!.email}
      </div>
    </div>
  );
}
