import type { AuditTrailEntry } from '@/types/database';

type Props = {
  entries: AuditTrailEntry[];
  locale: 'ru' | 'de';
  title?: string;
};

const FIELD_LABELS: Record<string, { ru: string; de: string }> = {
  amount: { ru: 'сумма', de: 'Betrag' },
  category: { ru: 'категория', de: 'Kategorie' },
  client_id: { ru: 'клиент', de: 'Kunde' },
  completed_at: { ru: 'завершен', de: 'abgeschlossen' },
  correction_of_order_id: { ru: 'корректировка к заказу', de: 'Korrektur zu Auftrag' },
  correction_reason: { ru: 'причина корректировки', de: 'Korrekturgrund' },
  custom_price: { ru: 'цена', de: 'Preis' },
  custom_service_title: { ru: 'услуга', de: 'Leistung' },
  deleted_at: { ru: 'архивный статус', de: 'Archivstatus' },
  description: { ru: 'описание', de: 'Beschreibung' },
  expense_date: { ru: 'дата расхода', de: 'Ausgabendatum' },
  invoice_issued_at: { ru: 'дата счёта', de: 'Rechnungsdatum' },
  invoice_locked_at: { ru: 'блокировка счёта', de: 'Rechnungssperre' },
  invoice_number: { ru: 'номер счёта', de: 'Rechnungsnummer' },
  invoice_sent_at: { ru: 'отправлено', de: 'versendet am' },
  invoice_sent_to: { ru: 'отправлено на', de: 'versendet an' },
  invoice_snapshot_json: { ru: 'snapshot счёта', de: 'Rechnungs-Snapshot' },
  invoice_version: { ru: 'версия счёта', de: 'Rechnungsversion' },
  order_address: { ru: 'адрес работы', de: 'Arbeitsadresse' },
  order_id: { ru: 'связанный заказ', de: 'verknuepfter Auftrag' },
  payment_method: { ru: 'способ оплаты', de: 'Zahlungsart' },
  pdf_file_path: { ru: 'PDF-файл', de: 'PDF-Datei' },
  receipt_file_path: { ru: 'чек', de: 'Beleg' },
  scheduled_at: { ru: 'запланирован', de: 'geplant' },
  service_date: { ru: 'дата услуги', de: 'Leistungsdatum' },
  service_id: { ru: 'услуга', de: 'Leistung' },
  signature_file_path: { ru: 'подпись', de: 'Unterschrift' },
  status: { ru: 'статус', de: 'Status' },
  tax_deductible: { ru: 'налоговый вычет', de: 'steuerlich absetzbar' },
  vendor: { ru: 'продавец', de: 'Anbieter' },
};

export default function AuditTrailList({ entries, locale, title }: Props) {
  if (entries.length === 0) return null;

  const text =
    locale === 'de'
      ? {
          changed: 'Geaenderte Felder',
          created: 'Datensatz erstellt',
          deleted: 'Datensatz geloescht',
          title: title ?? 'Audit Trail',
          updated: 'Datensatz geaendert',
        }
      : {
          changed: 'Измененные поля',
          created: 'Запись создана',
          deleted: 'Запись удалена',
          title: title ?? 'Аудит-история',
          updated: 'Запись изменена',
        };

  const formatDateTime = (value: string) =>
    new Date(value).toLocaleString(locale === 'de' ? 'de-DE' : 'ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  const getOperationLabel = (entry: AuditTrailEntry) => {
    if (entry.operation === 'INSERT') return text.created;
    if (entry.operation === 'DELETE') return text.deleted;
    return text.updated;
  };

  const getFieldLabel = (field: string) => FIELD_LABELS[field]?.[locale] ?? field;

  return (
    <div className="mb-4 rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
      <h2 className="mb-3 text-sm font-medium text-neutral-500">{text.title}</h2>
      <ul className="space-y-3">
        {entries.map((entry) => (
          <li key={entry.id} className="rounded-lg border border-neutral-100 p-3 text-sm dark:border-neutral-800">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium text-neutral-900 dark:text-neutral-100">
                {getOperationLabel(entry)}
              </span>
              <span className="text-xs text-neutral-400">{formatDateTime(entry.created_at)}</span>
            </div>
            {entry.changed_fields.length > 0 && (
              <div className="mt-2 text-xs text-neutral-500">
                {text.changed}: {entry.changed_fields.map(getFieldLabel).join(', ')}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
