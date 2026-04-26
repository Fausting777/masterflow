import Link from 'next/link';
import { BUSINESS_INFO } from '@/lib/legal/business-info';

export const metadata = {
  title: 'Datenschutz | MasterFlow',
  description: 'Datenschutzhinweise für MasterFlow',
};

export default function DatenschutzPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-4">
        <Link href="/dashboard" className="text-sm text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-300">
          ← Zurück zum Dashboard
        </Link>
      </div>

      <h1 className="text-3xl font-semibold">Datenschutzhinweise</h1>

      <div className="mt-8 space-y-8 text-sm leading-6 text-neutral-700 dark:text-neutral-300">
        <section>
          <h2 className="text-lg font-medium text-neutral-900 dark:text-neutral-100">1. Verantwortlicher</h2>
          <div className="mt-3 rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
            <p>{BUSINESS_INFO.legalName}</p>
            <p>Inhaber: {BUSINESS_INFO.owner}</p>
            <p>{BUSINESS_INFO.street}</p>
            <p>
              {BUSINESS_INFO.postalCode} {BUSINESS_INFO.city}, {BUSINESS_INFO.country}
            </p>
            <p>Telefon: {BUSINESS_INFO.phone}</p>
            <p>
              E-Mail:{' '}
              <a href={`mailto:${BUSINESS_INFO.email}`} className="text-blue-600 hover:underline">
                {BUSINESS_INFO.email}
              </a>
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-medium text-neutral-900 dark:text-neutral-100">2. Zweck der Verarbeitung</h2>
          <div className="mt-3 rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
            <p>Diese Anwendung verarbeitet personenbezogene Daten, um Kunden-, Auftrags-, Rechnungs- und Ausgabenprozesse zu verwalten.</p>
            <p className="mt-2">Dazu gehoeren insbesondere:</p>
            <ul className="mt-2 list-disc pl-5">
              <li>Benutzerkonto und Authentifizierung</li>
              <li>Kunden- und Auftragsverwaltung</li>
              <li>Erstellung, Korrektur, Archivierung und Versand von Rechnungen</li>
              <li>Verwaltung von Ausgaben, Belegen, Fotos und Signaturen</li>
              <li>Dokumentation von Änderungen und sicherheitsrelevanten Aktionen</li>
            </ul>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-medium text-neutral-900 dark:text-neutral-100">3. Kategorien verarbeiteter Daten</h2>
          <div className="mt-3 rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
            <ul className="list-disc pl-5">
              <li>Bestandsdaten wie Name, Anschrift, Telefonnummer und E-Mail-Adresse</li>
              <li>Rechnungs- und Leistungsdaten</li>
              <li>Zahlungsinformationen wie Zahlungsart, jedoch keine eigene Zahlungsabwicklung in der App</li>
              <li>Dateien wie Rechnungs-PDFs, Belegfotos, Einsatzfotos und Unterschriften</li>
              <li>Protokolldaten zu Freigaben, Versand, Korrekturen und gesperrten Änderungsversuchen</li>
              <li>Technische Daten für Session, Sicherheit und Zugriffsschutz</li>
            </ul>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-medium text-neutral-900 dark:text-neutral-100">4. Rechtsgrundlagen</h2>
          <div className="mt-3 rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
            <ul className="list-disc pl-5">
              <li>Art. 6 Abs. 1 lit. b DSGVO für vorvertragliche Maßnahmen und Vertragserfüllung</li>
              <li>Art. 6 Abs. 1 lit. c DSGVO für gesetzliche Aufbewahrungs- und Dokumentationspflichten</li>
              <li>Art. 6 Abs. 1 lit. f DSGVO für IT-Sicherheit, Missbrauchsschutz und nachvollziehbare Dokumentation</li>
            </ul>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-medium text-neutral-900 dark:text-neutral-100">5. Empfänger und Auftragsverarbeiter</h2>
          <div className="mt-3 rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
            <p>Zur technischen Bereitstellung und für einzelne Funktionen werden folgende Dienstleister eingesetzt:</p>
            <ul className="mt-2 list-disc pl-5">
              <li>Supabase (EU-Region, Irland) für Datenbank, Authentifizierung und Dateispeicher</li>
              <li>Resend (USA) für den Versand von Rechnungen per E-Mail</li>
              <li>SumUp (Irland) für die Zahlungsabwicklung und Speicherung von Transaktionsdaten (Betrag, Zahlungsart, Transaktionscode, Belegnummer)</li>
            </ul>
            <p className="mt-2">Eine Weitergabe erfolgt nur, soweit sie zur Bereitstellung der Anwendung oder zur Erfüllung gesetzlicher Pflichten erforderlich ist. Mit allen Auftragsverarbeitern wurden Auftragsverarbeitungsverträge gemäß Art. 28 DSGVO geschlossen.</p>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-medium text-neutral-900 dark:text-neutral-100">6. Speicherdauer</h2>
          <div className="mt-3 rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
            <p>
              Rechnungen, Rechnungssnapshots, Korrekturen, versandbezogene Nachweise sowie steuerlich relevante Belege
              werden nicht nur nach betrieblichem Bedarf, sondern auch zur Erfüllung gesetzlicher Aufbewahrungspflichten
              gespeichert.
            </p>
            <p className="mt-2">
              Für Rechnungen und steuerlich relevante Unterlagen gilt regelmäßig eine Aufbewahrung von mindestens 8 Jahren
              gemäß § 14b UStG und § 147 AO. Längere Aufbewahrung kann erforderlich sein, wenn steuerliche
              oder rechtliche Gründe dies verlangen.
            </p>
            <p className="mt-2">
              Sonstige Daten werden gelöscht, sobald sie für die genannten Zwecke nicht mehr erforderlich sind und keine
              gesetzlichen Pflichten oder berechtigten Interessen entgegenstehen.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-medium text-neutral-900 dark:text-neutral-100">7. Cookies und technisch notwendige Speicherungen</h2>
          <div className="mt-3 rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
            <p>
              Die Anwendung verwendet technisch notwendige Session- und Sicherheitsmechanismen, insbesondere für Login,
              Zugriffsschutz und Sitzungsverwaltung. Es findet nach aktuellem Stand kein Marketing- oder Werbetracking in der
              Anwendung statt.
            </p>
            <p className="mt-2">
              Zur Speicherung von Benutzereinstellungen (z.&#8239;B. Darstellungsmodus hell/dunkel) wird der lokale Browserspeicher
              (localStorage) verwendet. Diese Speicherung erfolgt ausschließlich auf dem Gerät des Nutzers, enthält keine
              personenbezogenen Daten und erfordert keine zusätzliche Einwilligung gemäß Art. 6 Abs. 1 lit.&#8239;f DSGVO
              (berechtigtes Interesse an der nutzerfreundlichen Darstellung).
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-medium text-neutral-900 dark:text-neutral-100">8. Ihre Rechte</h2>
          <div className="mt-3 rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
            <p>Sie haben nach der DSGVO insbesondere das Recht auf:</p>
            <ul className="mt-2 list-disc pl-5">
              <li>Auskunft nach Art. 15 DSGVO</li>
              <li>Berichtigung nach Art. 16 DSGVO</li>
              <li>Löschung nach Art. 17 DSGVO, soweit keine gesetzlichen Aufbewahrungspflichten entgegenstehen</li>
              <li>Einschränkung der Verarbeitung nach Art. 18 DSGVO</li>
              <li>Datenübertragbarkeit nach Art. 20 DSGVO</li>
              <li>Widerspruch nach Art. 21 DSGVO</li>
            </ul>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-medium text-neutral-900 dark:text-neutral-100">9. Beschwerderecht</h2>
          <div className="mt-3 rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
            <p>
              Sie haben das Recht, sich bei einer Datenschutzaufsichtsbehörde zu beschweren. Zuständig ist insbesondere:
            </p>
            <p className="mt-2">{BUSINESS_INFO.supervisoryAuthority}</p>
            <p>
              <a href={BUSINESS_INFO.supervisoryAuthorityUrl} className="text-blue-600 hover:underline">
                {BUSINESS_INFO.supervisoryAuthorityUrl}
              </a>
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-medium text-neutral-900 dark:text-neutral-100">10. Stand</h2>
          <div className="mt-3 rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
            <p>Stand dieser Datenschutzhinweise: 26.04.2026</p>
          </div>
        </section>
      </div>
    </main>
  );
}
