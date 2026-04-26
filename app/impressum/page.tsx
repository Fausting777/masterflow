import Link from 'next/link';
import { BUSINESS_INFO } from '@/lib/legal/business-info';

export const metadata = {
  title: 'Impressum | MasterFlow',
  description: 'Impressum und Anbieterkennzeichnung',
};

export default function ImpressumPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-4">
        <Link href="/dashboard" className="text-sm text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-300">
          ← Zurück zum Dashboard
        </Link>
      </div>

      <h1 className="text-3xl font-semibold">Impressum</h1>

      <div className="mt-8 space-y-8 text-sm leading-6 text-neutral-700 dark:text-neutral-300">
        <section>
          <h2 className="text-lg font-medium text-neutral-900 dark:text-neutral-100">Angaben gemäß § 5 DDG</h2>
          <div className="mt-3 rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
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
          <h2 className="text-lg font-medium text-neutral-900 dark:text-neutral-100">Kontakt</h2>
          <div className="mt-3 rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
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
          <h2 className="text-lg font-medium text-neutral-900 dark:text-neutral-100">Steuernummer</h2>
          <div className="mt-3 rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
            <p>Steuernummer: {BUSINESS_INFO.taxNumber}</p>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-medium text-neutral-900 dark:text-neutral-100">Umsatzsteuer</h2>
          <div className="mt-3 rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
            <p>{BUSINESS_INFO.vatNote}</p>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-medium text-neutral-900 dark:text-neutral-100">Verantwortlich für den Inhalt</h2>
          <div className="mt-3 rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
            <p>{BUSINESS_INFO.owner}</p>
            <p>{BUSINESS_INFO.street}</p>
            <p>
              {BUSINESS_INFO.postalCode} {BUSINESS_INFO.city}
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-medium text-neutral-900 dark:text-neutral-100">Hinweis</h2>
          <div className="mt-3 rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
            <p>
              Dieses Impressum wurde für die Anwendung {BUSINESS_INFO.brandName} mit den auf{' '}
              <a href={BUSINESS_INFO.website} className="text-blue-600 hover:underline">
                berlin-retter.de
              </a>{' '}
              veröffentlichten Kontaktdaten erstellt.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
