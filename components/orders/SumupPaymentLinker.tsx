'use client';

import { useState, useTransition } from 'react';
import { linkSumupTransactionAction } from '@/app/(dashboard)/orders/actions';
import { formatPrice } from '@/lib/utils/format';
import type { SumupTransaction } from '@/types/database';

type Props = {
  orderId: string;
  orderAmount: number | null;
  linkedTransaction: SumupTransaction | null;
  candidates: SumupTransaction[];
  locale: 'ru' | 'de';
};

export default function SumupPaymentLinker({
  orderId,
  orderAmount,
  linkedTransaction,
  candidates,
  locale,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState(candidates[0]?.id ?? '');

  const text =
    locale === 'de'
      ? {
          title: 'SumUp Zahlung',
          linked: 'Verknuepfte SumUp Zahlung',
          noCandidates:
            'Keine nicht verknuepften SumUp Zahlungen gefunden. Importiere zuerst Transaktionen in den SumUp Einstellungen.',
          selectPayment: 'Zahlung auswaehlen',
          link: 'Zahlung verknuepfen',
          linking: 'Wird verknuepft...',
          receipt: 'Beleg',
          transaction: 'Transaktion',
          paidAt: 'Bezahlt am',
          amountDiff: 'Differenz zum Auftrag',
          genericError: 'Fehler',
        }
      : {
          title: 'Оплата SumUp',
          linked: 'Привязанная оплата SumUp',
          noCandidates:
            'Непривязанные оплаты SumUp не найдены. Сначала импортируй транзакции в настройках SumUp.',
          selectPayment: 'Выбрать оплату',
          link: 'Привязать оплату',
          linking: 'Привязка...',
          receipt: 'Чек',
          transaction: 'Транзакция',
          paidAt: 'Оплачено',
          amountDiff: 'Разница с заказом',
          genericError: 'Ошибка',
        };

  const formatDateTime = (value: string | null) =>
    value
      ? new Date(value).toLocaleString(locale === 'de' ? 'de-DE' : 'ru-RU', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : '-';

  function handleLink() {
    if (!selectedId) return;
    setError(null);
    startTransition(async () => {
      const result = await linkSumupTransactionAction(orderId, selectedId);
      if (!result.ok) {
        setError(result.error ?? text.genericError);
      }
    });
  }

  const renderTransaction = (transaction: SumupTransaction) => {
    const diff =
      orderAmount !== null
        ? Math.round((Number(transaction.amount) - orderAmount) * 100) / 100
        : null;

    return (
      <div className="text-sm">
        <div className="font-medium">
          {transaction.transaction_code ?? transaction.sumup_transaction_id ?? text.transaction}
        </div>
        <div className="mt-1 text-xs text-neutral-500">
          {text.paidAt}: {formatDateTime(transaction.paid_at)}
        </div>
        {transaction.receipt_no && (
          <div className="mt-1 text-xs text-neutral-500">
            {text.receipt}: {transaction.receipt_no}
          </div>
        )}
        <div className="mt-1 text-xs text-neutral-500">
          {formatPrice(Number(transaction.amount))} {transaction.currency}
          {diff !== null && (
            <>
              {' '}
              · {text.amountDiff}: {formatPrice(diff)}
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="mb-4 rounded-xl border border-neutral-200 bg-white p-5">
      <h2 className="mb-3 text-sm font-medium text-neutral-500">{text.title}</h2>

      {linkedTransaction ? (
        <div className="rounded-lg border border-green-200 bg-green-50 p-3">
          <div className="mb-1 text-sm font-semibold text-green-800">{text.linked}</div>
          {renderTransaction(linkedTransaction)}
        </div>
      ) : candidates.length === 0 ? (
        <p className="text-sm text-neutral-500">{text.noCandidates}</p>
      ) : (
        <div className="space-y-3">
          <label htmlFor="sumup_transaction_id" className="block text-sm font-medium">
            {text.selectPayment}
          </label>
          <select
            id="sumup_transaction_id"
            value={selectedId}
            onChange={(event) => setSelectedId(event.target.value)}
            className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {candidates.map((transaction) => (
              <option key={transaction.id} value={transaction.id}>
                {formatPrice(Number(transaction.amount))} · {formatDateTime(transaction.paid_at)} ·{' '}
                {transaction.receipt_no ?? transaction.transaction_code ?? transaction.id.slice(0, 8)}
              </option>
            ))}
          </select>

          {selectedId && (
            <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
              {renderTransaction(candidates.find((candidate) => candidate.id === selectedId) ?? candidates[0])}
            </div>
          )}

          <button
            type="button"
            onClick={handleLink}
            disabled={isPending || !selectedId}
            className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:bg-blue-400"
          >
            {isPending ? text.linking : text.link}
          </button>

          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
      )}
    </div>
  );
}
