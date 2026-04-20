import { BUSINESS_INFO } from '@/lib/legal/business-info';

export const metadata = {
  title: 'Datenschutz | MasterFlow',
  description: 'Datenschutzhinweise fuer MasterFlow',
};

export default function DatenschutzPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-3xl font-semibold">Datenschutzhinweise</h1>

      <div className="mt-8 space-y-8 text-sm leading-6 text-neutral-700">
        <section>
          <h2 className="text-lg font-medium text-neutral-900">1. Verantwortlicher</h2>
          <div className="mt-3 rounded-xl border border-neutral-200 bg-white p-5">
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
          <h2 className="text-lg font-medium text-neutral-900">2. Zweck der Verarbeitung</h2>
          <div className="mt-3 rounded-xl border border-neutral-200 bg-white p-5">
            <p>Diese Anwendung verarbeitet personenbezogene Daten, um Kunden-, Auftrags-, Rechnungs- und Ausgabenprozesse zu verwalten.</p>
            <p className="mt-2">Dazu gehoeren insbesondere:</p>
            <ul className="mt-2 list-disc pl-5">
              <li>Benutzerkonto und Authentifizierung</li>
              <li>Kunden- und Auftragsverwaltung</li>
              <li>Erstellung, Korrektur, Archivierung und Versand von Rechnungen</li>
              <li>Verwaltung von Ausgaben, Belegen, Fotos und Signaturen</li>
              <li>Dokumentation von Aenderungen und sicherheitsrelevanten Aktionen</li>
            </ul>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-medium text-neutral-900">3. Kategorien verarbeiteter Daten</h2>
          <div className="mt-3 rounded-xl border border-neutral-200 bg-white p-5">
            <ul className="list-disc pl-5">
              <li>Bestandsdaten wie Name, Anschrift, Telefonnummer und E-Mail-Adresse</li>
              <li>Rechnungs- und Leistungsdaten</li>
              <li>Zahlungsinformationen wie Zahlungsart, jedoch keine eigene Zahlungsabwicklung in der App</li>
              <li>Dateien wie Rechnungs-PDFs, Belegfotos, Einsatzfotos und Unterschriften</li>
              <li>Protokolldaten zu Freigaben, Versand, Korrekturen und gesperrten Aenderungsversuchen</li>
              <li>Technische Daten fuer Session, Sicherheit und Zugriffsschutz</li>
            </ul>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-medium text-neutral-900">4. Rechtsgrundlagen</h2>
          <div className="mt-3 rounded-xl border border-neutral-200 bg-white p-5">
            <ul className="list-disc pl-5">
              <li>Art. 6 Abs. 1 lit. b DSGVO fuer vorvertragliche Massnahmen und Vertragserfuellung</li>
              <li>Art. 6 Abs. 1 lit. c DSGVO fuer gesetzliche Aufbewahrungs- und Dokumentationspflichten</li>
              <li>Art. 6 Abs. 1 lit. f DSGVO fuer IT-Sicherheit, Missbrauchsschutz und nachvollziehbare Dokumentation</li>
            </ul>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-medium text-neutral-900">5. Empfaenger und Auftragsverarbeiter</h2>
          <div className="mt-3 rounded-xl border border-neutral-200 bg-white p-5">
            <p>Zur technischen Bereitstellung und fuer einzelne Funktionen koennen folgende Dienstleister eingesetzt werden:</p>
            <ul className="mt-2 list-disc pl-5">
              <li>Supabase fuer Datenbank, Authentifizierung und Dateispeicher</li>
              <li>Resend fuer den Versand von Rechnungen per E-Mail</li>
            </ul>
            <p className="mt-2">Eine Weitergabe erfolgt nur, soweit sie zur Bereitstellung der Anwendung oder zur Erfuellung gesetzlicher Pflichten erforderlich ist.</p>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-medium text-neutral-900">6. Speicherdauer</h2>
          <div className="mt-3 rounded-xl border border-neutral-200 bg-white p-5">
            <p>
              Rechnungen, Rechnungssnapshots, Korrekturen, versandbezogene Nachweise sowie steuerlich relevante Belege
              werden nicht nur nach betrieblichem Bedarf, sondern auch zur Erfuellung gesetzlicher Aufbewahrungspflichten
              gespeichert.
            </p>
            <p className="mt-2">
              Fuer Rechnungen und steuerlich relevante Unterlagen gilt regelmaessig eine Aufbewahrung von mindestens 8 Jahren
              gemaess Paragraf 14b UStG und Paragraf 147 AO. Laengere Aufbewahrung kann erforderlich sein, wenn steuerliche
              oder rechtliche Gruende dies verlangen.
            </p>
            <p className="mt-2">
              Sonstige Daten werden geloescht, sobald sie fuer die genannten Zwecke nicht mehr erforderlich sind und keine
              gesetzlichen Pflichten oder berechtigten Interessen entgegenstehen.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-medium text-neutral-900">7. Cookies und technisch notwendige Speicherungen</h2>
          <div className="mt-3 rounded-xl border border-neutral-200 bg-white p-5">
            <p>
              Die Anwendung verwendet technisch notwendige Session- und Sicherheitsmechanismen, insbesondere fuer Login,
              Zugriffsschutz und Sitzungsverwaltung. Es findet nach aktuellem Stand kein Marketing- oder Werbetracking in der
              Anwendung statt.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-medium text-neutral-900">8. Ihre Rechte</h2>
          <div className="mt-3 rounded-xl border border-neutral-200 bg-white p-5">
            <p>Sie haben nach der DSGVO insbesondere das Recht auf:</p>
            <ul className="mt-2 list-disc pl-5">
              <li>Auskunft nach Art. 15 DSGVO</li>
              <li>Berichtigung nach Art. 16 DSGVO</li>
              <li>Loeschung nach Art. 17 DSGVO, soweit keine gesetzlichen Aufbewahrungspflichten entgegenstehen</li>
              <li>Einschraenkung der Verarbeitung nach Art. 18 DSGVO</li>
              <li>Datenuebertragbarkeit nach Art. 20 DSGVO</li>
              <li>Widerspruch nach Art. 21 DSGVO</li>
            </ul>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-medium text-neutral-900">9. Beschwerderecht</h2>
          <div className="mt-3 rounded-xl border border-neutral-200 bg-white p-5">
            <p>
              Sie haben das Recht, sich bei einer Datenschutzaufsichtsbehoerde zu beschweren. Zustaendig ist insbesondere:
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
          <h2 className="text-lg font-medium text-neutral-900">10. Stand</h2>
          <div className="mt-3 rounded-xl border border-neutral-200 bg-white p-5">
            <p>Stand dieser Datenschutzhinweise: 20.04.2026</p>
          </div>
        </section>
      </div>
    </main>
  );
}
