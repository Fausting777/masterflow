'use server';

import { createClient } from '@/lib/supabase/server';
import { escapeCsvCell } from '@/lib/security/csv';

export async function exportClientDataAction(clientId: string): Promise<{
  ok: boolean;
  csv?: string;
  filename?: string;
  error?: string;
}> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Nicht authentifiziert' };

  const { data: client } = await supabase
    .from('clients')
    .select('*')
    .eq('id', clientId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!client) return { ok: false, error: 'Kunde nicht gefunden' };

  const { data: orders } = await supabase
    .from('orders')
    .select('id, invoice_number, invoice_issued_at, service_date, custom_service_title, custom_price, payment_method, paid_at, order_address, created_at, deleted_at')
    .eq('client_id', clientId)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  const lines: string[] = [];

  lines.push('=== DSGVO-Datenauskunft Art. 15 / Datenübertragbarkeit Art. 20 ===');
  lines.push(`Exportdatum: ${new Date().toISOString()}`);
  lines.push('');

  lines.push('--- Kundendaten ---');
  lines.push(['Feld', 'Wert'].map(escapeCsvCell).join(';'));
  lines.push(['ID', client.id].map(escapeCsvCell).join(';'));
  lines.push(['Name', client.full_name ?? ''].map(escapeCsvCell).join(';'));
  lines.push(['Telefon', client.phone ?? ''].map(escapeCsvCell).join(';'));
  lines.push(['E-Mail', client.email ?? ''].map(escapeCsvCell).join(';'));
  lines.push(['Adresse', client.address ?? ''].map(escapeCsvCell).join(';'));
  lines.push(['PLZ', client.postal_code ?? ''].map(escapeCsvCell).join(';'));
  lines.push(['Ort', client.city ?? ''].map(escapeCsvCell).join(';'));
  lines.push(['Notiz', client.note ?? ''].map(escapeCsvCell).join(';'));
  lines.push(['Erstellt am', client.created_at ?? ''].map(escapeCsvCell).join(';'));
  lines.push('');

  lines.push('--- Aufträge ---');
  lines.push(
    ['Auftrags-ID', 'Rechnungsnummer', 'Rechnungsdatum', 'Leistungsdatum', 'Leistung', 'Betrag (EUR)', 'Zahlungsart', 'Bezahlt am', 'Einsatzadresse', 'Erstellt am', 'Gelöscht am']
      .map(escapeCsvCell).join(';')
  );
  for (const o of orders ?? []) {
    lines.push([
      o.id,
      o.invoice_number ?? '',
      o.invoice_issued_at ?? '',
      o.service_date ?? '',
      o.custom_service_title ?? '',
      o.custom_price !== null ? String(o.custom_price) : '',
      o.payment_method ?? '',
      o.paid_at ?? '',
      o.order_address ?? '',
      o.created_at ?? '',
      o.deleted_at ?? '',
    ].map(escapeCsvCell).join(';'));
  }

  const csv = lines.join('\r\n');
  const safeName = (client.full_name ?? 'Kunde').replace(/[^a-zA-Z0-9_\-]/g, '_');
  const filename = `DSGVO_Auskunft_${safeName}_${new Date().toISOString().slice(0, 10)}.csv`;

  return { ok: true, csv, filename };
}
