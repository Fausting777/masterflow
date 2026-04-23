'use server';

import { revalidatePath } from 'next/cache';
import { validateCsrfFormData } from '@/lib/csrf/server';
import { createClient } from '@/lib/supabase/server';
import { importableSumupTransactions } from '@/lib/sumup/client';
import { decryptSumupToken, encryptSumupToken, maskToken } from '@/lib/sumup/tokens';

export type SumupConnectionState = {
  formError?: string;
  success?: boolean;
  values?: {
    merchant_code: string;
    access_token: string;
  };
};

export type SumupSyncState = {
  formError?: string;
  imported?: number;
  success?: boolean;
};

export async function saveSumupConnectionAction(
  _prevState: SumupConnectionState,
  formData: FormData
): Promise<SumupConnectionState> {
  try {
    await validateCsrfFormData(formData);
  } catch {
    return { formError: 'CSRF validation failed' };
  }

  const raw = {
    merchant_code: String(formData.get('merchant_code') ?? '').trim(),
    access_token: String(formData.get('access_token') ?? '').trim(),
  };

  if (!raw.merchant_code) {
    return { formError: 'SumUp merchant code is required', values: raw };
  }

  if (!raw.access_token) {
    return { formError: 'SumUp access token is required', values: raw };
  }

  let encryptedToken: string;
  try {
    encryptedToken = encryptSumupToken(raw.access_token);
  } catch (error) {
    return {
      formError: error instanceof Error ? error.message : 'Could not encrypt SumUp token',
      values: raw,
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { formError: 'Not authorized', values: raw };
  }

  const { error } = await supabase.from('sumup_connections').upsert(
    {
      user_id: user.id,
      merchant_code: raw.merchant_code,
      access_token_encrypted: encryptedToken,
      access_token_hint: maskToken(raw.access_token),
    },
    { onConflict: 'user_id' }
  );

  if (error) {
    return { formError: error.message, values: raw };
  }

  revalidatePath('/settings/sumup');
  return { success: true, values: { merchant_code: raw.merchant_code, access_token: '' } };
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
  try {
    await validateCsrfFormData(formData);
  } catch {
    return { formError: 'CSRF validation failed' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { formError: 'Not authorized' };
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
    return { formError: 'SumUp is not connected yet' };
  }

  let accessToken: string;
  try {
    accessToken = decryptSumupToken(connection.access_token_encrypted);
  } catch (error) {
    return {
      formError: error instanceof Error ? error.message : 'Could not decrypt SumUp token',
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
      formError: error instanceof Error ? error.message : 'Could not import SumUp transactions',
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
