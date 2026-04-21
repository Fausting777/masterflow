'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { validateCsrfFormData } from '@/lib/csrf/server';
import { getLocale } from '@/lib/i18n/server';
import { validateUploadedFile } from '@/lib/security/file-validation';
import { createClient } from '@/lib/supabase/server';
import { normalizeExpenseInput, validateExpense, type ExpenseValidationErrors } from '@/lib/validators/expense';

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

async function getActionMessages() {
  const locale = await getLocale();
  return locale === 'de'
    ? {
        unauthorized: 'Nicht autorisiert',
        foreignOrder: 'Diese Ausgabe kann nicht mit einem fremden Auftrag verknüpft werden',
        createError: 'Fehler beim Erstellen',
        updateError: 'Fehler',
        uploadLog: 'Fehler beim Hochladen des Belegs:',
        receiptLarge: 'Beleg ist zu groß (max. 10 MB)',
        receiptType: 'Beleg muss JPEG, PNG oder WebP sein',
        permanentDelete:
          'Die endgültige Löschung von Ausgaben und Belegen ist deaktiviert. Steuerlich relevante Belege müssen aufbewahrt werden und können nur über den Papierkorb ausgeblendet werden.',
      }
    : {
        unauthorized: 'Не авторизован',
        foreignOrder: 'Нельзя привязать расход к чужому заказу',
        createError: 'Ошибка создания',
        updateError: 'Ошибка',
        uploadLog: 'Ошибка загрузки чека:',
        receiptLarge: 'Чек слишком большой (макс. 10 MB)',
        receiptType: 'Чек должен быть JPEG, PNG или WebP',
        permanentDelete:
          'Окончательное удаление расходов и чеков отключено. Налогово значимые Belege должны храниться и могут быть только скрыты через корзину.',
      };
}

async function ensureOwnedOrder(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  orderId: string | null
): Promise<string | null> {
  if (!orderId) return null;

  const { data: order } = await supabase.from('orders').select('id').eq('id', orderId).eq('user_id', userId).maybeSingle();
  return order ? order.id : null;
}

async function validateReceipt(receiptFile: File | null): Promise<Awaited<ReturnType<typeof validateUploadedFile>> | null> {
  if (!receiptFile || receiptFile.size === 0) return null;

  return validateUploadedFile(receiptFile, {
    allowedMimeTypes: RECEIPT_MIME_TYPES,
    maxBytes: MAX_RECEIPT_FILE_SIZE,
  });
}

async function mapReceiptError(validation: Awaited<ReturnType<typeof validateUploadedFile>> | null): Promise<string | null> {
  const m = await getActionMessages();
  if (!validation || validation.ok) return null;
  if (validation.error === 'too_large') return m.receiptLarge;
  return m.receiptType;
}

export async function createExpenseAction(
  _prevState: ExpenseFormState,
  formData: FormData
): Promise<ExpenseFormState> {
  try {
    await validateCsrfFormData(formData);
  } catch {
    return { formError: 'CSRF validation failed' };
  }

  const raw = readFormData(formData);
  const errors = validateExpense(raw);
  if (Object.keys(errors).length > 0) return { errors, values: raw };

  const supabase = await createClient();
  const m = await getActionMessages();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { formError: m.unauthorized, values: raw };

  const normalized = normalizeExpenseInput(raw);
  const orderId = await ensureOwnedOrder(supabase, user.id, normalized.order_id);
  if (normalized.order_id && !orderId) {
    return { formError: m.foreignOrder, values: raw };
  }

  const receiptFile = formData.get('receipt') as File | null;
  const receiptValidation = await validateReceipt(receiptFile);
  const receiptError = await mapReceiptError(receiptValidation);
  if (receiptError) return { formError: receiptError, values: raw };

  const { data: expense, error } = await supabase
    .from('expenses')
    .insert({
      user_id: user.id,
      ...normalized,
      order_id: orderId,
    })
    .select('id')
    .single();

  if (error) return { formError: `${m.createError}: ${error.message}`, values: raw };

  if (receiptFile && receiptValidation?.ok) {
    const path = `${user.id}/${expense.id}/receipt.${receiptValidation.extension}`;
    const { error: uploadError } = await supabase.storage.from('receipts').upload(path, receiptFile, {
      contentType: receiptValidation.detectedMimeType,
      upsert: true,
    });

    if (uploadError) {
      console.error(m.uploadLog, uploadError);
    } else {
      await supabase.from('expenses').update({ receipt_file_path: path }).eq('id', expense.id).eq('user_id', user.id);
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
  try {
    await validateCsrfFormData(formData);
  } catch {
    return { formError: 'CSRF validation failed' };
  }

  const raw = readFormData(formData);
  const errors = validateExpense(raw);
  if (Object.keys(errors).length > 0) return { errors, values: raw };

  const supabase = await createClient();
  const m = await getActionMessages();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { formError: m.unauthorized, values: raw };

  const normalized = normalizeExpenseInput(raw);
  const orderId = await ensureOwnedOrder(supabase, user.id, normalized.order_id);
  if (normalized.order_id && !orderId) {
    return { formError: m.foreignOrder, values: raw };
  }

  const receiptFile = formData.get('receipt') as File | null;
  const receiptValidation = await validateReceipt(receiptFile);
  const receiptError = await mapReceiptError(receiptValidation);
  if (receiptError) return { formError: receiptError, values: raw };

  const { error } = await supabase
    .from('expenses')
    .update({
      ...normalized,
      order_id: orderId,
    })
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) return { formError: `${m.updateError}: ${error.message}`, values: raw };

  if (receiptFile && receiptValidation?.ok) {
    const path = `${user.id}/${id}/receipt.${receiptValidation.extension}`;
    const { error: uploadError } = await supabase.storage.from('receipts').upload(path, receiptFile, {
      contentType: receiptValidation.detectedMimeType,
      upsert: true,
    });

    if (!uploadError) {
      await supabase.from('expenses').update({ receipt_file_path: path }).eq('id', id).eq('user_id', user.id);
    }
  }

  revalidatePath('/expenses');
  revalidatePath(`/expenses/${id}`);
  redirect('/expenses');
}

export async function softDeleteExpenseAction(id: string): Promise<void> {
  const supabase = await createClient();
  const m = await getActionMessages();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error(m.unauthorized);

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
  const m = await getActionMessages();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error(m.unauthorized);

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
  const m = await getActionMessages();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error(m.unauthorized);
  void id;

  throw new Error(m.permanentDelete);
}
