'use server';

import { escapeCsvCell } from '@/lib/security/csv';
import { createClient } from '@/lib/supabase/server';

export async function exportAuditTrailCsvAction(): Promise<{
  ok: boolean;
  csv?: string;
  filename?: string;
  error?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, error: 'Nicht autorisiert' };

  const allRows: typeof data = [];
  const PAGE = 1000;
  let offset = 0;
  let done = false;
  while (!done) {
    const { data: page, error: pageError } = await supabase
      .from('audit_trail')
      .select('table_name, record_id, operation, changed_fields, old_data, new_data, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + PAGE - 1);
    if (pageError) return { ok: false, error: pageError.message };
    if (!page || page.length === 0) { done = true; break; }
    allRows.push(...page);
    if (page.length < PAGE) done = true;
    offset += PAGE;
  }
  const data = allRows;
  const error = null;

  if (!data || data.length === 0) return { ok: false, error: 'Keine Audit-Einträge gefunden' };

  const headers = ['created_at', 'table_name', 'record_id', 'operation', 'changed_fields', 'old_data', 'new_data'];
  const rows = data.map((entry) => [
    entry.created_at ?? '',
    entry.table_name ?? '',
    entry.record_id ?? '',
    entry.operation ?? '',
    Array.isArray(entry.changed_fields) ? entry.changed_fields.join(', ') : '',
    entry.old_data ? JSON.stringify(entry.old_data) : '',
    entry.new_data ? JSON.stringify(entry.new_data) : '',
  ]);

  const lines = [
    headers.map(escapeCsvCell).join(';'),
    ...rows.map((row) => row.map((cell) => escapeCsvCell(String(cell))).join(';')),
  ];

  const csv = '\uFEFF' + lines.join('\r\n');
  const label = new Date().toISOString().slice(0, 10);

  return {
    ok: true,
    csv,
    filename: `audit-trail_${label}.csv`,
  };
}
