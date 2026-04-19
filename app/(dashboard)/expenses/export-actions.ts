'use server';

import { createClient } from '@/lib/supabase/server';
import { EXPENSE_CATEGORY_LABELS } from '@/lib/utils/format';
import type { ExpenseCategory } from '@/types/database';

export type ExportFilter = {
  fromDate: string;    // YYYY-MM-DD
  toDate: string;
  category?: string;   // 'all' или ExpenseCategory
};

export async function exportExpensesCsvAction(
  filter: ExportFilter
): Promise<{
  ok: boolean;
  csv?: string;
  filename?: string;
  error?: string;
}> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Не авторизован' };

  let query = supabase
    .from('expenses')
    .select('id, category, amount, description, vendor, expense_date, tax_deductible, order_id, created_at, receipt_file_path')
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .order('expense_date', { ascending: true });

  if (filter.fromDate) query = query.gte('expense_date', filter.fromDate);
  if (filter.toDate) query = query.lte('expense_date', filter.toDate);
  if (filter.category && filter.category !== 'all') {
    query = query.eq('category', filter.category);
  }

  const { data: expenses, error } = await query;
  if (error) return { ok: false, error: error.message };
  if (!expenses || expenses.length === 0) {
    return { ok: false, error: 'Нет расходов в выбранном периоде' };
  }

  // Подтягиваем связанные заказы для колонки "Заказ"
  const orderIds = [...new Set(expenses.filter(e => e.order_id).map(e => e.order_id!))];
  const orderMap = new Map<string, { invoice_number: string | null; client_name: string }>();
  if (orderIds.length > 0) {
    const { data: orders } = await supabase
      .from('orders')
      .select('id, client_id, invoice_number')
      .in('id', orderIds);

    const clientIds = [...new Set((orders ?? []).map(o => o.client_id))];
    const { data: clients } = await supabase
      .from('clients')
      .select('id, full_name')
      .in('id', clientIds);
    const clientNames = new Map((clients ?? []).map(c => [c.id, c.full_name]));

    for (const o of orders ?? []) {
      orderMap.set(o.id, {
        invoice_number: o.invoice_number,
        client_name: clientNames.get(o.client_id) ?? '—',
      });
    }
  }

  // CSV
  const headers = [
    'Datum',
    'Kategorie',
    'Betrag',
    'Beschreibung',
    'Anbieter',
    'Steuerlich absetzbar',
    'Zugehöriger Auftrag',
    'Rechnungsnummer',
    'Beleg vorhanden',
  ];

  const rows = expenses.map(e => {
    const dateLabel = new Date(e.expense_date).toLocaleDateString('de-DE');
    const category = EXPENSE_CATEGORY_LABELS[e.category as ExpenseCategory];
    const amountStr = Number(e.amount).toFixed(2).replace('.', ',');
    const taxLabel = e.tax_deductible ? 'Ja' : 'Nein';
    const receiptLabel = e.receipt_file_path ? 'Ja' : 'Nein';
    const orderInfo = e.order_id ? orderMap.get(e.order_id) : null;

    return [
      dateLabel,
      category,
      amountStr,
      e.description ?? '',
      e.vendor ?? '',
      taxLabel,
      orderInfo?.client_name ?? '',
      orderInfo?.invoice_number ?? '',
      receiptLabel,
    ];
  });

  const escape = (v: string) => {
    if (v.includes(';') || v.includes('"') || v.includes('\n')) {
      return `"${v.replace(/"/g, '""')}"`;
    }
    return v;
  };

  const lines = [
    headers.map(escape).join(';'),
    ...rows.map(r => r.map(c => escape(String(c))).join(';')),
  ];

  const total = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const taxTotal = expenses
    .filter(e => e.tax_deductible)
    .reduce((sum, e) => sum + Number(e.amount), 0);

  lines.push('');
  lines.push(`Gesamt;;${total.toFixed(2).replace('.', ',')};;;;;;`);
  lines.push(`Davon absetzbar;;${taxTotal.toFixed(2).replace('.', ',')};;;;;;`);

  const csv = '\uFEFF' + lines.join('\r\n');
  const filename = `Ausgaben_${filter.fromDate}_${filter.toDate}.csv`;

  return { ok: true, csv, filename };
}