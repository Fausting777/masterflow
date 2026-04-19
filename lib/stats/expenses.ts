// lib/stats/expenses.ts
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ExpenseCategory } from '@/types/database';

// Итог расходов за период с разбивкой по категориям
export async function getExpensesSummary(
  supabase: SupabaseClient,
  userId: string,
  fromDate: string,  // YYYY-MM-DD
  toDate: string
): Promise<{
  total: number;
  taxDeductible: number;
  count: number;
  byCategory: Record<ExpenseCategory, number>;
}> {
  const { data, error } = await supabase
    .from('expenses')
    .select('category, amount, tax_deductible')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .gte('expense_date', fromDate)
    .lte('expense_date', toDate);

  const byCategory: Record<ExpenseCategory, number> = {
    material: 0,
    fahrtkosten: 0,
    werkzeuge: 0,
    telefon_internet: 0,
    versicherung: 0,
    buero: 0,
    weiterbildung: 0,
    sonstiges: 0,
  };

  if (error || !data || data.length === 0) {
    return { total: 0, taxDeductible: 0, count: 0, byCategory };
  }

  let total = 0;
  let taxDeductible = 0;

  for (const e of data) {
    const amt = Number(e.amount);
    total += amt;
    if (e.tax_deductible) taxDeductible += amt;
    byCategory[e.category as ExpenseCategory] += amt;
  }

  return {
    total: Math.round(total * 100) / 100,
    taxDeductible: Math.round(taxDeductible * 100) / 100,
    count: data.length,
    byCategory,
  };
}
// Разбивка расходов по месяцам (для графика)
export async function getMonthlyExpenses(
  supabase: SupabaseClient,
  userId: string,
  months: Array<{ from: Date; to: Date }>
): Promise<number[]> {
  const first = months[0].from;
  const last = months[months.length - 1].to;
  const fromDate = `${first.getFullYear()}-${String(first.getMonth() + 1).padStart(2, '0')}-01`;
  const lastY = last.getFullYear();
  const lastM = last.getMonth();
  const lastDay = new Date(lastY, lastM + 1, 0).getDate();
  const toDate = `${lastY}-${String(lastM + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  const { data } = await supabase
    .from('expenses')
    .select('amount, expense_date')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .gte('expense_date', fromDate)
    .lte('expense_date', toDate);

  if (!data || data.length === 0) return months.map(() => 0);

  const result = months.map(() => 0);
  for (const e of data) {
    const d = new Date(e.expense_date + 'T12:00:00').getTime();
    for (let i = 0; i < months.length; i++) {
      if (d >= months[i].from.getTime() && d <= months[i].to.getTime()) {
        result[i] += Number(e.amount);
        break;
      }
    }
  }

  return result.map(v => Math.round(v * 100) / 100);
}