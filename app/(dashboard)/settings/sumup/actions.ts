'use server';

import { revalidatePath } from 'next/cache';
import { validateCsrfFormData } from '@/lib/csrf/server';
import { getLocale } from '@/lib/i18n/server';
import { createClient } from '@/lib/supabase/server';
import { importableSumupTransactions, resolveSumupMerchant } from '@/lib/sumup/client';
import { decryptSumupToken, encryptSumupToken, maskToken } from '@/lib/sumup/tokens';

export type SumupConnectionState = {
  formError?: string;
  success?: boolean;
  values?: {
    access_token: string;
  };
};

export type SumupSyncState = {
  formError?: string;
  imported?: number;
  success?: boolean;
};

async function getMessages() {
  const locale = await getLocale();
  return locale === 'de'
    ? {
        csrfFailed: 'CSRF-Prüfung fehlgeschlagen',
        unauthorized: 'Nicht autorisiert',
        tokenRequired: 'SumUp Access Token ist erforderlich',
        merchantError: 'SumUp Händlercode konnte nicht ermittelt werden',
        encryptError: 'Token konnte nicht verschlüsselt werden',
        notConnected: 'SumUp ist noch nicht verbunden',
        decryptError: 'Token konnte nicht entschlüsselt werden',
        importError: 'SumUp-Transaktionen konnten nicht importiert werden',
      }
    : {
        csrfFailed: 'Проверка CSRF не пройдена',
        unauthorized: 'Нет авторизации',
        tokenRequired: 'Требуется SumUp Access Token',
        merchantError: 'Не удалось определить код продавца SumUp',
        encryptError: 'Не удалось зашифровать токен',
        notConnected: 'SumUp ещё не подключён',
        decryptError: 'Не удалось расшифровать токен',
        importError: 'Не удалось импортировать транзакции SumUp',
      };
}

export async function saveSumupConnectionAction(
  _prevState: SumupConnectionState,
  formData: FormData
): Promise<SumupConnectionState> {
  const m = await getMessages();

  try {
    await validateCsrfFormData(formData);
  } catch {
    return { formError: m.csrfFailed };
  }

  const raw = {
    access_token: String(formData.get('access_token') ?? '').trim(),
  };
  const emptyValues = { access_token: '' };

  if (!raw.access_token) {
    return { formError: m.tokenRequired, values: emptyValues };
  }

  let merchantCode: string;
  try {
    const merchant = await resolveSumupMerchant(raw.access_token);
    merchantCode = merchant.merchantCode;
  } catch (error) {
    return {
      formError: error instanceof Error
        ? `${m.merchantError}: ${error.message}`
        : m.merchantError,
      values: emptyValues,
    };
  }

  let encryptedToken: string;
  try {
    encryptedToken = encryptSumupToken(raw.access_token);
  } catch (error) {
    return {
      formError: error instanceof Error ? error.message : m.encryptError,
      values: emptyValues,
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { formError: m.unauthorized, values: emptyValues };
  }

  const { error } = await supabase.from('sumup_connections').upsert(
    {
      user_id: user.id,
      merchant_code: merchantCode,
      access_token_encrypted: encryptedToken,
      access_token_hint: maskToken(raw.access_token),
    },
    { onConflict: 'user_id' }
  );

  if (error) {
    return { formError: error.message, values: emptyValues };
  }

  revalidatePath('/settings/sumup');
  return { success: true, values: emptyValues };
}

export async function deleteSumupConnectionAction(formData: FormData) {
  try {
    await validateCsrfFormData(formData);
  } catch {
    return;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  await supabase.from('sumup_connections').delete().eq('user_id', user.id);
  revalidatePath('/settings/sumup');
}

export async function syncSumupTransactionsAction(
  _prevState: SumupSyncState,
  formData: FormData
): Promise<SumupSyncState> {
  const m = await getMessages();

  try {
    await validateCsrfFormData(formData);
  } catch {
    return { formError: m.csrfFailed };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { formError: m.unauthorized };
  }

  const { data: connection, error: connectionError } = await supabase
    .from('sumup_connections')
    .select('merchant_code, access_token_encrypted')
    .eq('user_id', user.id)
    .maybeSingle();

  if (connectionError) {
    return { formError: connectionError.message };
  }

  if (!connection) {
    return { formError: m.notConnected };
  }

  let accessToken: string;
  try {
    accessToken = decryptSumupToken(connection.access_token_encrypted);
  } catch (error) {
    return {
      formError: error instanceof Error ? error.message : m.decryptError,
    };
  }

  let transactions;
  try {
    transactions = await importableSumupTransactions({
      accessToken,
      merchantCode: connection.merchant_code,
      limit: 50,
    });
  } catch (error) {
    return {
      formError: error instanceof Error ? error.message : m.importError,
    };
  }

  if (transactions.length > 0) {
    const { error: upsertError } = await supabase.from('sumup_transactions').upsert(
      transactions.map((transaction) => ({
        user_id: user.id,
        ...transaction,
      })),
      { onConflict: 'user_id,sumup_transaction_id' }
    );

    if (upsertError) {
      return { formError: upsertError.message };
    }
  }

  await supabase
    .from('sumup_connections')
    .update({ last_synced_at: new Date().toISOString() })
    .eq('user_id', user.id);

  revalidatePath('/settings/sumup');
  return { success: true, imported: transactions.length };
}
