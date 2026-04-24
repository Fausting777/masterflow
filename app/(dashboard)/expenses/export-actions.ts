'use server';

import { getLocale } from '@/lib/i18n/server';
import { escapeCsvCell } from '@/lib/security/csv';
import { createClient } from '@/lib/supabase/server';
import { formatDate, getExpenseCategoryLabel } from '@/lib/utils/format';
import type { ExpenseCategory } from '@/types/database';

export type ExportFilter = {
  fromDate: string;
  toDate: string;
  category?: string;
};

export async function exportExpensesCsvAction(
  filter: ExportFilter
): Promise<{
  ok: boolean;
  csv?: string;
  filename?: string;
  error?: string;
}> {
  const locale = await getLocale();
  const text =
    locale === 'de'
      ? {
          unauthorized: 'Nicht autorisiert',
          empty: 'Keine Ausgaben im gewaehlten Zeitraum',
          unknownClient: '—',
          headers: [
            'Datum',
            'Kategorie',
            'Betrag',
            'Beschreibung',
            'Anbieter',
            'Steuerlich absetzbar',
            'Zugehoeriger Auftrag',
            'Quittungsnummer',
            'Beleg vorhanden',
            'Beleg-Pfad',
            'Beleg-SHA256',
          ],
          yes: 'Ja',
          no: 'Nein',
          total: 'Gesamt',
          deductible: 'Davon absetzbar',
          filename: 'Ausgaben',
        }
      : {
          unauthorized: 'Нет авторизации',
          empty: 'Нет расходов в выбранном периоде',
          unknownClient: '—',
          headers: [
            'Дата',
            'Категория',
            'Сумма',
            'Описание',
            'Поставщик',
            'К вычету',
            'Связанный заказ',
            'Номер квитанции',
            'Есть чек',
            'Путь к чеку',
            'SHA-256 чека',
          ],
          yes: 'Да',
          no: 'Нет',
          total: 'Итого',
          deductible: 'Из них к вычету',
          filename: 'Расходы',
        };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, error: text.unauthorized };

  let query = supabase
    .from('expenses')
    .select(
      'id, category, amount, description, vendor, expense_date, tax_deductible, order_id, created_at, receipt_file_path, receipt_sha256'
    )
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
  if (!expenses || expenses.length === 0) return { ok: false, error: text.empty };

  const orderIds = [...new Set(expenses.filter((expense) => expense.order_id).map((expense) => expense.order_id!))];
  const orderMap = new Map<string, { invoice_number: string | null; client_name: string }>();

  if (orderIds.length > 0) {
    const { data: orders } = await supabase
      .from('orders')
      .select('id, client_id, invoice_number')
      .in('id', orderIds);

    const clientIds = [...new Set((orders ?? []).map((order) => order.client_id))];
    const { data: clients } = await supabase
      .from('clients')
      .select('id, full_name')
      .in('id', clientIds);
    const clientNames = new Map((clients ?? []).map((client) => [client.id, client.full_name]));

    for (const order of orders ?? []) {
      orderMap.set(order.id, {
        invoice_number: order.invoice_number,
        client_name: clientNames.get(order.client_id) ?? text.unknownClient,
      });
    }
  }

  const rows = expenses.map((expense) => {
    const dateLabel = formatDate(expense.expense_date, locale);
    const category = getExpenseCategoryLabel(expense.category as ExpenseCategory, locale);
    const amountStr = Number(expense.amount).toFixed(2).replace('.', ',');
    const taxLabel = expense.tax_deductible ? text.yes : text.no;
    const receiptLabel = expense.receipt_file_path ? text.yes : text.no;
    const orderInfo = expense.order_id ? orderMap.get(expense.order_id) : null;

    return [
      dateLabel,
      category,
      amountStr,
      expense.description ?? '',
      expense.vendor ?? '',
      taxLabel,
      orderInfo?.client_name ?? '',
      orderInfo?.invoice_number ?? '',
      receiptLabel,
      expense.receipt_file_path ?? '',
      expense.receipt_sha256 ?? '',
    ];
  });

  const lines = [
    text.headers.map(escapeCsvCell).join(';'),
    ...rows.map((row) => row.map((cell) => escapeCsvCell(String(cell))).join(';')),
  ];

  const total = expenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
  const taxTotal = expenses
    .filter((expense) => expense.tax_deductible)
    .reduce((sum, expense) => sum + Number(expense.amount), 0);

  lines.push('');
  lines.push(`${text.total};;${total.toFixed(2).replace('.', ',')};;;;;;;;;`);
  lines.push(`${text.deductible};;${taxTotal.toFixed(2).replace('.', ',')};;;;;;;;;`);

  const csv = '\uFEFF' + lines.join('\r\n');
  const filename = `${text.filename}_${filter.fromDate}_${filter.toDate}.csv`;

  return { ok: true, csv, filename };
}
