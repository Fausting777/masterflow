'use server';

import { getLocale } from '@/lib/i18n/server';
import { escapeCsvCell } from '@/lib/security/csv';
import { createClient } from '@/lib/supabase/server';
import { formatDate, getExpenseCategoryLabel } from '@/lib/utils/format';
import type { Expense, ExpenseCategory } from '@/types/database';

export type ExportFilter = {
  fromDate?: string | null;
  toDate?: string | null;
  category?: string;
  search?: string | null;
};

function money(value: number | string | null | undefined) {
  if (value === null || value === undefined) return '';
  return Number(value).toFixed(2).replace('.', ',');
}

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
          empty: 'Keine Ausgaben in der aktuellen Auswahl',
          unknownClient: '-',
          headers: [
            'Datum',
            'Kategorie',
            'Betrag',
            'Beschreibung',
            'Anbieter',
            'Steuerlich absetzbar',
            'Zugehoeriger Auftrag',
            'Rechnungsnummer',
            'Beleg vorhanden',
            'Beleg-Pfad',
            'Beleg-SHA256',
            'Erstellt am',
          ],
          yes: 'Ja',
          no: 'Nein',
          total: 'Gesamt',
          deductible: 'Davon absetzbar',
          filename: 'Ausgaben',
          all: 'alle',
          search: 'suche',
        }
      : {
          unauthorized: '\u041d\u0435\u0442 \u0430\u0432\u0442\u043e\u0440\u0438\u0437\u0430\u0446\u0438\u0438',
          empty:
            '\u041d\u0435\u0442 \u0440\u0430\u0441\u0445\u043e\u0434\u043e\u0432 \u0432 \u0442\u0435\u043a\u0443\u0449\u0435\u0439 \u0432\u044b\u0431\u043e\u0440\u043a\u0435',
          unknownClient: '-',
          headers: [
            '\u0414\u0430\u0442\u0430',
            '\u041a\u0430\u0442\u0435\u0433\u043e\u0440\u0438\u044f',
            '\u0421\u0443\u043c\u043c\u0430',
            '\u041e\u043f\u0438\u0441\u0430\u043d\u0438\u0435',
            '\u041f\u043e\u0441\u0442\u0430\u0432\u0449\u0438\u043a',
            '\u041a \u0432\u044b\u0447\u0435\u0442\u0443',
            '\u0421\u0432\u044f\u0437\u0430\u043d\u043d\u044b\u0439 \u0437\u0430\u043a\u0430\u0437',
            '\u041d\u043e\u043c\u0435\u0440 \u043a\u0432\u0438\u0442\u0430\u043d\u0446\u0438\u0438',
            '\u0415\u0441\u0442\u044c \u0447\u0435\u043a',
            '\u041f\u0443\u0442\u044c \u043a \u0447\u0435\u043a\u0443',
            'SHA-256 \u0447\u0435\u043a\u0430',
            '\u0421\u043e\u0437\u0434\u0430\u043d\u043e',
          ],
          yes: '\u0414\u0430',
          no: '\u041d\u0435\u0442',
          total: '\u0418\u0442\u043e\u0433\u043e',
          deductible: '\u0418\u0437 \u043d\u0438\u0445 \u043a \u0432\u044b\u0447\u0435\u0442\u0443',
          filename: 'Rashody',
          all: 'vse',
          search: 'poisk',
        };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, error: text.unauthorized };

  let query = supabase
    .from('expenses')
    .select(
      'id, user_id, category, amount, description, vendor, expense_date, tax_deductible, order_id, created_at, receipt_file_path, receipt_sha256'
    )
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .order('expense_date', { ascending: true })
    .order('created_at', { ascending: true });

  if (filter.fromDate) query = query.gte('expense_date', filter.fromDate);
  if (filter.toDate) query = query.lte('expense_date', filter.toDate);
  if (filter.category && filter.category !== 'all') {
    query = query.eq('category', filter.category);
  }

  const { data, error } = await query;
  if (error) return { ok: false, error: error.message };

  let expenses = ((data ?? []) as Expense[]).filter((expense) => expense.user_id === user.id);
  const search = filter.search?.trim().toLowerCase();
  if (search) {
    expenses = expenses.filter(
      (expense) =>
        (expense.description ?? '').toLowerCase().includes(search) ||
        (expense.vendor ?? '').toLowerCase().includes(search)
    );
  }

  if (expenses.length === 0) return { ok: false, error: text.empty };

  const orderIds = [...new Set(expenses.filter((expense) => expense.order_id).map((expense) => expense.order_id!))];
  const orderMap = new Map<string, { invoice_number: string | null; client_name: string }>();

  if (orderIds.length > 0) {
    const { data: orders } = await supabase
      .from('orders')
      .select('id, client_id, invoice_number')
      .eq('user_id', user.id)
      .in('id', orderIds);

    const clientIds = [...new Set((orders ?? []).map((order) => order.client_id).filter(Boolean))];
    const clientNames = new Map<string, string>();

    if (clientIds.length > 0) {
      const { data: clients } = await supabase
        .from('clients')
        .select('id, full_name')
        .eq('user_id', user.id)
        .in('id', clientIds);

      for (const client of clients ?? []) {
        clientNames.set(client.id, client.full_name);
      }
    }

    for (const order of orders ?? []) {
      orderMap.set(order.id, {
        invoice_number: order.invoice_number,
        client_name: clientNames.get(order.client_id) ?? text.unknownClient,
      });
    }
  }

  const rows = expenses.map((expense) => {
    const category = getExpenseCategoryLabel(expense.category as ExpenseCategory, locale);
    const taxLabel = expense.tax_deductible ? text.yes : text.no;
    const receiptLabel = expense.receipt_file_path ? text.yes : text.no;
    const orderInfo = expense.order_id ? orderMap.get(expense.order_id) : null;

    return [
      formatDate(expense.expense_date, locale),
      category,
      money(expense.amount),
      expense.description ?? '',
      expense.vendor ?? '',
      taxLabel,
      orderInfo?.client_name ?? '',
      orderInfo?.invoice_number ?? '',
      receiptLabel,
      expense.receipt_file_path ?? '',
      expense.receipt_sha256 ?? '',
      formatDate(expense.created_at, locale),
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
  lines.push([text.total, '', money(total), '', '', '', '', '', '', '', '', ''].map(escapeCsvCell).join(';'));
  lines.push([text.deductible, '', money(taxTotal), '', '', '', '', '', '', '', '', ''].map(escapeCsvCell).join(';'));

  const suffix = [
    filter.fromDate || text.all,
    filter.toDate || text.all,
    filter.category && filter.category !== 'all' ? filter.category : text.all,
    search ? text.search : null,
  ]
    .filter(Boolean)
    .join('_');

  return {
    ok: true,
    csv: '\uFEFF' + lines.join('\r\n'),
    filename: `${text.filename}_${suffix}.csv`,
  };
}
