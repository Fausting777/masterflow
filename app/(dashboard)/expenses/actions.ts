'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import {
  validateExpense,
  normalizeExpenseInput,
  type ExpenseValidationErrors,
} from '@/lib/validators/expense';

export type ExpenseFormState = {
  errors?: ExpenseValidationErrors;
  formError?: string;
  values?: {
    category: string;
    amount: string;
    description: string;
    vendor: string;
    expense_date: string;
    tax_deductible: string;
    order_id: string;
  };
};

function readFormData(formData: FormData): ExpenseFormState['values'] & object {
  return {
    category: String(formData.get('category') ?? ''),
    amount: String(formData.get('amount') ?? ''),
    description: String(formData.get('description') ?? ''),
    vendor: String(formData.get('vendor') ?? ''),
    expense_date: String(formData.get('expense_date') ?? ''),
    tax_deductible: String(formData.get('tax_deductible') ?? ''),
    order_id: String(formData.get('order_id') ?? ''),
  };
}

// ============================================================
// CREATE
// ============================================================
export async function createExpenseAction(
  _prevState: ExpenseFormState,
  formData: FormData
): Promise<ExpenseFormState> {
  const raw = readFormData(formData);

  const errors = validateExpense(raw);
  if (Object.keys(errors).length > 0) return { errors, values: raw };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { formError: 'Не авторизован', values: raw };

  const normalized = normalizeExpenseInput(raw);

  // Обработка загруженного файла чека (если прислан)
  const receiptFile = formData.get('receipt') as File | null;
  let receipt_file_path: string | null = null;

  const { data: expense, error } = await supabase
    .from('expenses')
    .insert({
      user_id: user.id,
      ...normalized,
    })
    .select('id')
    .single();

  if (error) {
    return { formError: `Ошибка создания: ${error.message}`, values: raw };
  }

  // Если есть файл чека — загружаем и обновляем путь
  if (receiptFile && receiptFile.size > 0) {
    const ext = receiptFile.name.split('.').pop()?.toLowerCase() ?? 'jpg';
    const path = `${user.id}/${expense.id}/receipt.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('receipts')
      .upload(path, receiptFile, {
        contentType: receiptFile.type || 'image/jpeg',
        upsert: true,
      });

    if (uploadError) {
      // Файл не загрузился, но расход создан — просто логируем
      console.error('Ошибка загрузки чека:', uploadError);
    } else {
      receipt_file_path = path;
      await supabase
        .from('expenses')
        .update({ receipt_file_path })
        .eq('id', expense.id)
        .eq('user_id', user.id);
    }
  }

  revalidatePath('/expenses');
  redirect('/expenses');
}

// ============================================================
// UPDATE
// ============================================================
export async function updateExpenseAction(
  id: string,
  _prevState: ExpenseFormState,
  formData: FormData
): Promise<ExpenseFormState> {
  const raw = readFormData(formData);

  const errors = validateExpense(raw);
  if (Object.keys(errors).length > 0) return { errors, values: raw };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { formError: 'Не авторизован', values: raw };

  const normalized = normalizeExpenseInput(raw);

  const { error } = await supabase
    .from('expenses')
    .update(normalized)
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) return { formError: `Ошибка: ${error.message}`, values: raw };

  // Замена чека (если прислан новый)
  const receiptFile = formData.get('receipt') as File | null;
  if (receiptFile && receiptFile.size > 0) {
    const ext = receiptFile.name.split('.').pop()?.toLowerCase() ?? 'jpg';
    const path = `${user.id}/${id}/receipt.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('receipts')
      .upload(path, receiptFile, {
        contentType: receiptFile.type || 'image/jpeg',
        upsert: true,
      });

    if (!uploadError) {
      await supabase
        .from('expenses')
        .update({ receipt_file_path: path })
        .eq('id', id)
        .eq('user_id', user.id);
    }
  }

  revalidatePath('/expenses');
  revalidatePath(`/expenses/${id}`);
  redirect(`/expenses`);
}

// ============================================================
// SOFT DELETE (в корзину)
// ============================================================
export async function softDeleteExpenseAction(id: string): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Не авторизован');

  const { error } = await supabase
    .from('expenses')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) throw new Error(error.message);

  revalidatePath('/expenses');
  revalidatePath('/expenses/trash');
  redirect('/expenses');
}

// ============================================================
// RESTORE
// ============================================================
export async function restoreExpenseAction(id: string): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Не авторизован');

  const { error } = await supabase
    .from('expenses')
    .update({ deleted_at: null })
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) throw new Error(error.message);

  revalidatePath('/expenses');
  revalidatePath('/expenses/trash');
  redirect(`/expenses`);
}

// ============================================================
// PERMANENT DELETE (окончательно)
// ============================================================
export async function permanentDeleteExpenseAction(id: string): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Не авторизован');

  // Сначала получаем путь к чеку, чтобы удалить файл
  const { data: expense } = await supabase
    .from('expenses')
    .select('receipt_file_path')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle();

  // Удаляем запись
  const { error } = await supabase
    .from('expenses')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) throw new Error(error.message);

  // Удаляем файл чека из storage
  if (expense?.receipt_file_path) {
    await supabase.storage.from('receipts').remove([expense.receipt_file_path]);
  }

  revalidatePath('/expenses');
  revalidatePath('/expenses/trash');
  redirect('/expenses/trash');
}