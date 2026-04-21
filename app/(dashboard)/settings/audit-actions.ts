'use server';

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

  const { data, error } = await supabase
    .from('audit_trail')
    .select('table_name, record_id, operation, changed_fields, old_data, new_data, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(5000);

  if (error) return { ok: false, error: error.message };
  if (!data || data.length === 0) return { ok: false, error: 'Keine Audit-Einträge gefunden' };

  const escape = (value: string) => {
    if (value.includes(';') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  };

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
    headers.map(escape).join(';'),
    ...rows.map((row) => row.map((cell) => escape(String(cell))).join(';')),
  ];

  const csv = '\uFEFF' + lines.join('\r\n');
  const label = new Date().toISOString().slice(0, 10);

  return {
    ok: true,
    csv,
    filename: `audit-trail_${label}.csv`,
  };
}
