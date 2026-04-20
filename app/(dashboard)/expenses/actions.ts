'use server';

import { validateUploadedFile } from '@/lib/security/file-validation';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import {
  normalizeExpenseInput,
  validateExpense,
  type ExpenseValidationErrors,
} from '@/lib/validators/expense';

const MAX_RECEIPT_FILE_SIZE = 10 * 1024 * 1024;
const RECEIPT_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

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

async function ensureOwnedOrder(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  orderId: string | null
): Promise<string | null> {
  if (!orderId) return null;

  const { data: order } = await supabase
    .from('orders')
    .select('id')
    .eq('id', orderId)
    .eq('user_id', userId)
    .maybeSingle();

  return order ? order.id : null;
}

async function validateReceipt(
  receiptFile: File | null
): Promise<Awaited<ReturnType<typeof validateUploadedFile>> | null> {
  if (!receiptFile || receiptFile.size === 0) return null;

  return validateUploadedFile(receiptFile, {
    allowedMimeTypes: RECEIPT_MIME_TYPES,
    maxBytes: MAX_RECEIPT_FILE_SIZE,
  });
}

function mapReceiptError(
  validation: Awaited<ReturnType<typeof validateUploadedFile>> | null
): string | null {
  if (!validation || validation.ok) return null;
  if (validation.error === 'too_large') {
    return 'Чек слишком большой (макс. 10 MB)';
  }
  return 'Чек должен быть JPEG, PNG или WebP';
}

export async function createExpenseAction(
  _prevState: ExpenseFormState,
  formData: FormData
): Promise<ExpenseFormState> {
  const raw = readFormData(formData);

  const errors = validateExpense(raw);
  if (Object.keys(errors).length > 0) return { errors, values: raw };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { formError: 'Не авторизован', values: raw };

  const normalized = normalizeExpenseInput(raw);
  const orderId = await ensureOwnedOrder(supabase, user.id, normalized.order_id);
  if (normalized.order_id && !orderId) {
    return { formError: 'Нельзя привязать расход к чужому заказу', values: raw };
  }

  const receiptFile = formData.get('receipt') as File | null;
  const receiptValidation = await validateReceipt(receiptFile);
  const receiptError = mapReceiptError(receiptValidation);
  if (receiptError) {
    return { formError: receiptError, values: raw };
  }

  let receiptFilePath: string | null = null;

  const { data: expense, error } = await supabase
    .from('expenses')
    .insert({
      user_id: user.id,
      ...normalized,
      order_id: orderId,
    })
    .select('id')
    .single();

  if (error) {
    return { formError: `Ошибка создания: ${error.message}`, values: raw };
  }

  if (receiptFile && receiptValidation?.ok) {
    const path = `${user.id}/${expense.id}/receipt.${receiptValidation.extension}`;

    const { error: uploadError } = await supabase.storage.from('receipts').upload(path, receiptFile, {
      contentType: receiptValidation.detectedMimeType,
      upsert: true,
    });

    if (uploadError) {
      console.error('Ошибка загрузки чека:', uploadError);
    } else {
      receiptFilePath = path;
      await supabase
        .from('expenses')
        .update({ receipt_file_path: receiptFilePath })
        .eq('id', expense.id)
        .eq('user_id', user.id);
    }
  }

  revalidatePath('/expenses');
  redirect('/expenses');
}

export async function updateExpenseAction(
  id: string,
  _prevState: ExpenseFormState,
  formData: FormData
): Promise<ExpenseFormState> {
  const raw = readFormData(formData);

  const errors = validateExpense(raw);
  if (Object.keys(errors).length > 0) return { errors, values: raw };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { formError: 'Не авторизован', values: raw };

  const normalized = normalizeExpenseInput(raw);
  const orderId = await ensureOwnedOrder(supabase, user.id, normalized.order_id);
  if (normalized.order_id && !orderId) {
    return { formError: 'Нельзя привязать расход к чужому заказу', values: raw };
  }

  const receiptFile = formData.get('receipt') as File | null;
  const receiptValidation = await validateReceipt(receiptFile);
  const receiptError = mapReceiptError(receiptValidation);
  if (receiptError) {
    return { formError: receiptError, values: raw };
  }

  const { error } = await supabase
    .from('expenses')
    .update({
      ...normalized,
      order_id: orderId,
    })
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) return { formError: `Ошибка: ${error.message}`, values: raw };

  if (receiptFile && receiptValidation?.ok) {
    const path = `${user.id}/${id}/receipt.${receiptValidation.extension}`;

    const { error: uploadError } = await supabase.storage.from('receipts').upload(path, receiptFile, {
      contentType: receiptValidation.detectedMimeType,
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
  redirect('/expenses');
}

export async function softDeleteExpenseAction(id: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
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

export async function restoreExpenseAction(id: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Не авторизован');

  const { error } = await supabase
    .from('expenses')
    .update({ deleted_at: null })
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) throw new Error(error.message);

  revalidatePath('/expenses');
  revalidatePath('/expenses/trash');
  redirect('/expenses');
}

export async function permanentDeleteExpenseAction(id: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Не авторизован');
  void id;

  throw new Error(
    'Окончательное удаление расходов и чеков отключено. Налогово значимые Belege должны храниться и могут быть только скрыты через корзину.'
  );
}
