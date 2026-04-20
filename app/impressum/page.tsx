import { BUSINESS_INFO } from '@/lib/legal/business-info';

export const metadata = {
  title: 'Impressum | MasterFlow',
  description: 'Impressum und Anbieterkennzeichnung',
};

export default function ImpressumPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-semibold">Impressum</h1>

      <div className="mt-8 space-y-8 text-sm leading-6 text-neutral-700">
        <section>
          <h2 className="text-lg font-medium text-neutral-900">Angaben gemaess Paragraf 5 DDG</h2>
          <div className="mt-3 rounded-xl border border-neutral-200 bg-white p-5">
            <p>{BUSINESS_INFO.legalName}</p>
            <p>Inhaber: {BUSINESS_INFO.owner}</p>
            <p>{BUSINESS_INFO.street}</p>
            <p>
              {BUSINESS_INFO.postalCode} {BUSINESS_INFO.city}
            </p>
            <p>{BUSINESS_INFO.country}</p>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-medium text-neutral-900">Kontakt</h2>
          <div className="mt-3 rounded-xl border border-neutral-200 bg-white p-5">
            <p>Telefon: {BUSINESS_INFO.phone}</p>
            <p>
              E-Mail:{' '}
              <a href={`mailto:${BUSINESS_INFO.email}`} className="text-blue-600 hover:underline">
                {BUSINESS_INFO.email}
              </a>
            </p>
            <p>
              Website:{' '}
              <a href={BUSINESS_INFO.website} className="text-blue-600 hover:underline">
                {BUSINESS_INFO.website}
              </a>
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-medium text-neutral-900">Umsatzsteuer</h2>
          <div className="mt-3 rounded-xl border border-neutral-200 bg-white p-5">
            <p>{BUSINESS_INFO.vatNote}</p>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-medium text-neutral-900">Verantwortlich fuer den Inhalt</h2>
          <div className="mt-3 rounded-xl border border-neutral-200 bg-white p-5">
            <p>{BUSINESS_INFO.owner}</p>
            <p>{BUSINESS_INFO.street}</p>
            <p>
              {BUSINESS_INFO.postalCode} {BUSINESS_INFO.city}
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-medium text-neutral-900">Hinweis</h2>
          <div className="mt-3 rounded-xl border border-neutral-200 bg-white p-5">
            <p>
              Dieses Impressum wurde fuer die Anwendung {BUSINESS_INFO.brandName} mit den auf{' '}
              <a href={BUSINESS_INFO.website} className="text-blue-600 hover:underline">
                berlin-retter.de
              </a>{' '}
              veroeffentlichten Kontaktdaten erstellt.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
