import 'server-only';

const SUMUP_API_BASE_URL = 'https://api.sumup.com';

type SumupTransactionItem = {
  id?: string;
  transaction_code?: string;
  amount?: number | string;
  currency?: string;
  timestamp?: string;
  status?: string;
  payment_type?: string;
  entry_mode?: string;
};

type SumupTransactionsResponse = {
  items?: SumupTransactionItem[];
};

type SumupReceiptResponse = {
  transaction_data?: {
    receipt_no?: string;
    transaction_code?: string;
    transaction_id?: string;
    amount?: string;
    currency?: string;
    timestamp?: string;
    status?: string;
    payment_type?: string;
    entry_mode?: string;
  };
};

type SumupMembershipResponse = {
  items?: Array<{
    resource_id?: string;
    type?: string;
    status?: string;
    resource?: {
      id?: string;
      type?: string;
      name?: string;
    };
  }>;
};

async function requestSumup<T>(path: string, accessToken: string): Promise<T> {
  const response = await fetch(`${SUMUP_API_BASE_URL}${path}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`SumUp API error ${response.status}: ${body || response.statusText}`);
  }

  return response.json() as Promise<T>;
}

export type ImportedSumupTransaction = {
  sumup_transaction_id: string | null;
  transaction_code: string | null;
  receipt_no: string | null;
  amount: number;
  currency: string;
  status: string | null;
  payment_type: string | null;
  entry_mode: string | null;
  paid_at: string | null;
  raw_json: unknown;
};

export async function listSumupTransactions({
  accessToken,
  merchantCode,
  limit = 50,
}: {
  accessToken: string;
  merchantCode: string;
  limit?: number;
}) {
  const params = new URLSearchParams({
    order: 'descending',
    limit: String(limit),
  });

  const data = await requestSumup<SumupTransactionsResponse>(
    `/v2.1/merchants/${encodeURIComponent(merchantCode)}/transactions/history?${params.toString()}`,
    accessToken
  );

  return data.items ?? [];
}

export async function resolveSumupMerchant(accessToken: string) {
  const params = new URLSearchParams({
    limit: '25',
    'resource.type': 'merchant',
    status: 'accepted',
  });

  const data = await requestSumup<SumupMembershipResponse>(
    `/v0.1/memberships?${params.toString()}`,
    accessToken
  );

  const membership = (data.items ?? []).find((item) => {
    const type = item.resource?.type ?? item.type;
    return type === 'merchant' && (item.resource?.id || item.resource_id);
  });

  if (!membership) {
    throw new Error('No SumUp merchant account was found for this access token');
  }

  return {
    merchantCode: membership.resource?.id ?? membership.resource_id!,
    merchantName: membership.resource?.name ?? null,
  };
}

export async function getSumupReceipt({
  accessToken,
  merchantCode,
  id,
}: {
  accessToken: string;
  merchantCode: string;
  id: string;
}) {
  const params = new URLSearchParams({ mid: merchantCode });

  return requestSumup<SumupReceiptResponse>(
    `/v1.1/receipts/${encodeURIComponent(id)}?${params.toString()}`,
    accessToken
  );
}

export async function importableSumupTransactions({
  accessToken,
  merchantCode,
  limit = 50,
}: {
  accessToken: string;
  merchantCode: string;
  limit?: number;
}): Promise<ImportedSumupTransaction[]> {
  const items = await listSumupTransactions({ accessToken, merchantCode, limit });
  const imported: ImportedSumupTransaction[] = [];

  for (const item of items) {
    const amount = Number(item.amount);
    if (!Number.isFinite(amount)) continue;

    const receiptLookupId = item.id ?? item.transaction_code;
    let receiptNo: string | null = null;
    let receipt: SumupReceiptResponse | null = null;

    if (receiptLookupId) {
      try {
        receipt = await getSumupReceipt({
          accessToken,
          merchantCode,
          id: receiptLookupId,
        });
        receiptNo = receipt.transaction_data?.receipt_no ?? null;
      } catch {
        receipt = null;
      }
    }

    imported.push({
      sumup_transaction_id: item.id ?? receipt?.transaction_data?.transaction_id ?? null,
      transaction_code: item.transaction_code ?? receipt?.transaction_data?.transaction_code ?? null,
      receipt_no: receiptNo,
      amount,
      currency: item.currency ?? receipt?.transaction_data?.currency ?? 'EUR',
      status: item.status ?? receipt?.transaction_data?.status ?? null,
      payment_type: item.payment_type ?? receipt?.transaction_data?.payment_type ?? null,
      entry_mode: item.entry_mode ?? receipt?.transaction_data?.entry_mode ?? null,
      paid_at: item.timestamp ?? receipt?.transaction_data?.timestamp ?? null,
      raw_json: { transaction: item, receipt },
    });
  }

  return imported.filter((item) => item.sumup_transaction_id || item.transaction_code);
}
