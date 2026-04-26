import Link from 'next/link';
import { BUSINESS_INFO } from '@/lib/legal/business-info';

export const metadata = {
  title: 'Verfahrensdokumentation | MasterFlow',
};

export default function VerfahrensdokumentationPage() {
  const today = new Date().toLocaleDateString('de-DE');

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-4">
        <Link
          href="/settings"
          className="text-sm text-neutral-500 hover:text-neutral-700 dark:text-neutral-400"
        >
          ← Zurück zu Einstellungen
        </Link>
      </div>

      <h1 className="text-2xl font-semibold">Verfahrensdokumentation</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Gemäß GoBD (BMF-Schreiben vom 28.11.2019) — Stand: {today}
      </p>

      <div className="mt-8 space-y-8 text-sm leading-6 text-neutral-700 dark:text-neutral-300">

        <section>
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            1. Unternehmen und Anwendung
          </h2>
          <div className="mt-3 rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900 space-y-2">
            <p><span className="font-medium">Unternehmen:</span> {BUSINESS_INFO.legalName}</p>
            <p><span className="font-medium">Inhaber:</span> {BUSINESS_INFO.owner}</p>
            <p><span className="font-medium">Anschrift:</span> {BUSINESS_INFO.street}, {BUSINESS_INFO.postalCode} {BUSINESS_INFO.city}</p>
            <p><span className="font-medium">Steuernummer:</span> {BUSINESS_INFO.taxNumber}</p>
            <p><span className="font-medium">Anwendung:</span> MasterFlow — webbasierte Auftragsverwaltung</p>
            <p><span className="font-medium">Betrieb:</span> SaaS, gehostet bei Supabase (EU-Region, Irland)</p>
            <p><span className="font-medium">Zweck:</span> Erstellung, Verwaltung und Archivierung von Aufträgen, Rechnungen, Rechnungskorrekturen, Ausgaben und Belegen für steuerliche und betriebliche Zwecke</p>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            2. Erfassung und Bearbeitung von Aufträgen
          </h2>
          <div className="mt-3 rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900 space-y-2">
            <p>Aufträge werden manuell durch den Nutzer angelegt. Jeder Auftrag enthält mindestens: Kunde, Leistungsart, Leistungsdatum, Preis und Zahlungsart.</p>
            <p>Optional: Einsatzadresse, Fotos vor/nach der Arbeit, Kundensignatur, Verknüpfung mit SumUp-Transaktion.</p>
            <p>Aufträge können bearbeitet werden, solange keine Rechnung erstellt wurde. Nach Rechnungserstellung ist eine Direktbearbeitung gesperrt (<code className="text-xs bg-neutral-100 dark:bg-neutral-800 px-1 rounded">invoice_locked_at</code>). Korrekturen erfolgen ausschließlich über den Storno-/Korrekturprozess (Abschnitt 4).</p>
            <p>Gelöschte Aufträge werden in den Papierkorb verschoben (Soft-Delete). Aufträge mit Rechnung können nicht dauerhaft gelöscht werden — sie bleiben als Buchhaltungsdokument erhalten.</p>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            3. Erstellung von Rechnungen (§ 14 UStG)
          </h2>
          <div className="mt-3 rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900 space-y-2">
            <p>Rechnungen werden als PDF generiert und unveränderlich gespeichert. Die Rechnungsnummer wird fortlaufend und eindeutig vergeben.</p>
            <p>Jede Rechnung enthält die Pflichtangaben nach § 14 UStG: Name und Anschrift des leistenden Unternehmers, Name und Anschrift des Leistungsempfängers, Steuernummer, Rechnungsdatum, fortlaufende Rechnungsnummer, Art und Umfang der Leistung, Leistungsdatum, Entgelt sowie den Kleinunternehmer-Hinweis nach § 19 UStG.</p>
            <p>Nach Erstellung wird der Auftrag gesperrt: Felder wie Preis, Kundendaten und Leistung können nicht mehr direkt geändert werden. Die Sperre ist durch einen Datenbank-Trigger technisch durchgesetzt (<code className="text-xs bg-neutral-100 dark:bg-neutral-800 px-1 rounded">prevent_locked_order_mutation</code>).</p>
            <p>Die PDF-Datei wird mit SHA-256-Prüfsumme gespeichert (<code className="text-xs bg-neutral-100 dark:bg-neutral-800 px-1 rounded">pdf_sha256</code>) und kann jederzeit auf Unversehrtheit geprüft werden.</p>
            <p>Rechnungen können per E-Mail an den Kunden gesendet werden. Der Versand wird im Aktivitätsprotokoll erfasst.</p>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            4. Rechnungskorrekturen (Storno)
          </h2>
          <div className="mt-3 rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900 space-y-2">
            <p>Fehler in einer bereits ausgestellten Rechnung werden ausschließlich durch eine Rechnungskorrektur behoben. Die ursprüngliche Rechnung bleibt unverändert erhalten.</p>
            <p>Eine Korrektur ist ein neuer Auftrag mit dem Präfix <code className="text-xs bg-neutral-100 dark:bg-neutral-800 px-1 rounded">Korrektur:</code> im Titel und einer Referenz auf die ursprüngliche Rechnungsnummer (<code className="text-xs bg-neutral-100 dark:bg-neutral-800 px-1 rounded">correction_of_order_id</code>). Die Korrektur-PDF enthält einen Verweis auf die Originalrechnung.</p>
            <p>Sowohl Original- als auch Korrekturrechnung werden im Rechnungsregister unter &quot;Rechnungen&quot; gelistet und sind im CSV-Export enthalten.</p>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            5. Ausgaben und Belege
          </h2>
          <div className="mt-3 rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900 space-y-2">
            <p>Betriebliche Ausgaben werden mit Betrag, Kategorie, Datum, Beschreibung und optionalem Belegfoto erfasst.</p>
            <p>Belegfotos werden in einem privaten Supabase-Storage-Bucket (<code className="text-xs bg-neutral-100 dark:bg-neutral-800 px-1 rounded">receipts</code>) gespeichert und mit SHA-256-Prüfsumme gesichert (<code className="text-xs bg-neutral-100 dark:bg-neutral-800 px-1 rounded">receipt_sha256</code>).</p>
            <p>Steuerlich relevante Ausgaben (<code className="text-xs bg-neutral-100 dark:bg-neutral-800 px-1 rounded">tax_deductible = true</code>) können nicht dauerhaft gelöscht werden, solange die gesetzliche Aufbewahrungspflicht (§ 147 AO: 8–10 Jahre) besteht. Eine Verschiebung in den Papierkorb (Soft-Delete) ist möglich.</p>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            6. Unveränderbarkeit und Protokollierung (GoBD)
          </h2>
          <div className="mt-3 rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900 space-y-2">
            <p>Alle relevanten Änderungen werden in zwei Protokolltabellen aufgezeichnet:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><code className="text-xs bg-neutral-100 dark:bg-neutral-800 px-1 rounded">activity_logs</code> — Nutzeraktionen wie Erstellung, Bearbeitung, Versand, Statusänderungen</li>
              <li><code className="text-xs bg-neutral-100 dark:bg-neutral-800 px-1 rounded">audit_trail</code> — automatische Datenbanktrigger-Logs mit Old-/New-Daten für jede Änderung</li>
            </ul>
            <p>Beide Tabellen sind append-only: UPDATE und DELETE sind durch Row-Level-Security auf Datenbankebene verboten. Einträge können weder geändert noch entfernt werden.</p>
            <p>Gesperrte Rechnungsfelder sind durch Datenbank-Trigger (<code className="text-xs bg-neutral-100 dark:bg-neutral-800 px-1 rounded">prevent_locked_order_mutation</code>) vor direkter Änderung geschützt. Jeder Versuch wird im Audit Trail erfasst.</p>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            7. Rollen und Zugriffsrechte
          </h2>
          <div className="mt-3 rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900 space-y-2">
            <p>Die Anwendung wird ausschließlich vom Inhaber ({BUSINESS_INFO.owner}) genutzt. Es gibt keine weiteren Benutzerrollen.</p>
            <p>Zugang nur nach Authentifizierung über Supabase Auth (E-Mail + Passwort). Alle Daten sind durch Row-Level-Security (RLS) auf den authentifizierten Nutzer beschränkt — kein anderer Nutzer kann auf die Daten zugreifen.</p>
            <p>Bei Beendigung der Nutzung: Passwort-Änderung oder Konto-Deaktivierung über Supabase Dashboard. Die gespeicherten Daten bleiben für die gesetzliche Aufbewahrungsfrist erhalten.</p>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            8. Datenspeicherung und Backup
          </h2>
          <div className="mt-3 rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900 space-y-2">
            <p><span className="font-medium">Primärspeicher:</span> Supabase PostgreSQL-Datenbank, EU-Region (Frankfurt, AWS eu-central-1). Dateien (PDFs, Fotos, Belege) in Supabase Storage.</p>
            <p><span className="font-medium">Backup:</span> Supabase erstellt automatisch tägliche Point-in-Time-Backups der Datenbank. Für den Pro-Plan sind Backups 7 Tage verfügbar, für höhere Pläne länger.</p>
            <p><span className="font-medium">Zusätzlicher Export:</span> CSV-Export aller Rechnungen, Ausgaben und des Audit Trails ist jederzeit über Einstellungen → Export möglich. Diese Exporte sollten regelmäßig heruntergeladen und an einem sicheren Ort aufbewahrt werden.</p>
            <p><span className="font-medium">Aufbewahrung:</span> Rechnungen und steuerlich relevante Unterlagen mindestens 8 Jahre gemäß § 14b UStG und § 147 AO. Sonstige Geschäftsdaten nach § 257 HGB.</p>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            9. Export für Steuerprüfung
          </h2>
          <div className="mt-3 rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900 space-y-2">
            <p>Folgende Exporte stehen für die Steuerprüfung (§ 147 Abs. 6 AO — Datenzugriff) zur Verfügung:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Rechnungsregister (alle Rechnungen und Korrekturen) als CSV — unter &quot;Rechnungen&quot;</li>
              <li>Auftragsübersicht als CSV — unter &quot;Aufträge&quot;</li>
              <li>Ausgaben und Belege als CSV — unter &quot;Ausgaben&quot;</li>
              <li>Vollständiger Audit Trail (alle Datenbankänderungen) als CSV — unter &quot;Einstellungen&quot;</li>
            </ul>
            <p>Alle Exporte sind gegen Formula-Injection geschützt. Rechnungs-PDFs können einzeln heruntergeladen werden. Belegfotos sind über die Ausgabendetailseite zugänglich.</p>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            10. Auftragsverarbeiter (Art. 28 DSGVO)
          </h2>
          <div className="mt-3 rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-neutral-200 dark:border-neutral-700">
                  <th className="text-left py-2 pr-4 font-medium">Dienstleister</th>
                  <th className="text-left py-2 pr-4 font-medium">Zweck</th>
                  <th className="text-left py-2 font-medium">Sitz / Datentransfer</th>
                </tr>
              </thead>
              <tbody className="space-y-1">
                <tr className="border-b border-neutral-100 dark:border-neutral-800">
                  <td className="py-2 pr-4">Supabase</td>
                  <td className="py-2 pr-4">Datenbank, Auth, Dateispeicher</td>
                  <td className="py-2">Deutschland / EU (AWS eu-central-1, Frankfurt)</td>
                </tr>
                <tr className="border-b border-neutral-100 dark:border-neutral-800">
                  <td className="py-2 pr-4">Resend</td>
                  <td className="py-2 pr-4">E-Mail-Versand von Rechnungen</td>
                  <td className="py-2">USA — DPA geschlossen</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4">SumUp</td>
                  <td className="py-2 pr-4">Zahlungsabwicklung</td>
                  <td className="py-2">Irland / EU</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

      </div>
    </main>
  );
}
