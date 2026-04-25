'use client';

import { useState, useTransition } from 'react';
import {
  linkSumupTransactionAction,
  updateLinkedSumupPaymentMethodAction,
} from '@/app/(dashboard)/orders/actions';
import { formatPrice } from '@/lib/utils/format';
import type { PaymentMethod, SumupTransaction } from '@/types/database';

type SumupPaymentMethod = 'cash' | 'ec_card';

type Props = {
  orderId: string;
  orderAmount: number | null;
  orderPaymentMethod: PaymentMethod | null;
  linkedTransaction: SumupTransaction | null;
  candidates: SumupTransaction[];
  locale: 'ru' | 'de';
};

export default function SumupPaymentLinker({
  orderId,
  orderAmount,
  orderPaymentMethod,
  linkedTransaction,
  candidates,
  locale,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState(candidates[0]?.id ?? '');
  const [sumupPaymentMethod, setSumupPaymentMethod] = useState<SumupPaymentMethod>(
    orderPaymentMethod === 'cash' ? 'cash' : 'ec_card'
  );

  const selectedTransaction = candidates.find((candidate) => candidate.id === selectedId) ?? candidates[0];
  const amountWarning =
    orderAmount !== null && selectedTransaction
      ? Math.round((Number(selectedTransaction.amount) - orderAmount) * 100) / 100 !== 0
      : false;

  const text =
    locale === 'de'
      ? {
          title: 'SumUp Zahlung',
          linked: 'Verknuepfte SumUp Zahlung',
          noCandidates:
            'Keine nicht verknuepften SumUp Zahlungen gefunden. Importiere zuerst Transaktionen in den SumUp Einstellungen.',
          selectPayment: 'Zahlung auswaehlen',
          methodLabel: 'Wie wurde in SumUp bezahlt?',
          methodCash: 'Barzahlung',
          methodCard: 'EC-Karte',
          link: 'Zahlung verknuepfen',
          updateMethod: 'Zahlungsart speichern',
          linking: 'Wird gespeichert...',
          receipt: 'Beleg',
          transaction: 'Transaktion',
          paidAt: 'Bezahlt am',
          amountDiff: 'Differenz zum Auftrag',
          amountMismatch: 'Achtung: Der Betrag der Transaktion stimmt nicht mit dem Auftragsbetrag ueberein.',
          genericError: 'Fehler',
        }
      : {
          title: '\u041e\u043f\u043b\u0430\u0442\u0430 SumUp',
          linked: '\u041f\u0440\u0438\u0432\u044f\u0437\u0430\u043d\u043d\u0430\u044f \u043e\u043f\u043b\u0430\u0442\u0430 SumUp',
          noCandidates:
            '\u041d\u0435\u043f\u0440\u0438\u0432\u044f\u0437\u0430\u043d\u043d\u044b\u0435 \u043e\u043f\u043b\u0430\u0442\u044b SumUp \u043d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d\u044b. \u0421\u043d\u0430\u0447\u0430\u043b\u0430 \u0438\u043c\u043f\u043e\u0440\u0442\u0438\u0440\u0443\u0439 \u0442\u0440\u0430\u043d\u0437\u0430\u043a\u0446\u0438\u0438 \u0432 \u043d\u0430\u0441\u0442\u0440\u043e\u0439\u043a\u0430\u0445 SumUp.',
          selectPayment: '\u0412\u044b\u0431\u0440\u0430\u0442\u044c \u043e\u043f\u043b\u0430\u0442\u0443',
          methodLabel: '\u041a\u0430\u043a \u043f\u0440\u043e\u0448\u043b\u0430 \u043e\u043f\u043b\u0430\u0442\u0430 \u0432 SumUp?',
          methodCash: '\u041d\u0430\u043b\u0438\u0447\u043d\u044b\u0435',
          methodCard: 'EC-\u043a\u0430\u0440\u0442\u0430',
          link: '\u041f\u0440\u0438\u0432\u044f\u0437\u0430\u0442\u044c \u043e\u043f\u043b\u0430\u0442\u0443',
          updateMethod:
            '\u0421\u043e\u0445\u0440\u0430\u043d\u0438\u0442\u044c \u0441\u043f\u043e\u0441\u043e\u0431 \u043e\u043f\u043b\u0430\u0442\u044b',
          linking: '\u0421\u043e\u0445\u0440\u0430\u043d\u044f\u0435\u0442\u0441\u044f...',
          receipt: '\u0427\u0435\u043a',
          transaction: '\u0422\u0440\u0430\u043d\u0437\u0430\u043a\u0446\u0438\u044f',
          paidAt: '\u041e\u043f\u043b\u0430\u0447\u0435\u043d\u043e',
          amountDiff: '\u0420\u0430\u0437\u043d\u0438\u0446\u0430 \u0441 \u0437\u0430\u043a\u0430\u0437\u043e\u043c',
          amountMismatch:
            '\u0412\u043d\u0438\u043c\u0430\u043d\u0438\u0435: \u0441\u0443\u043c\u043c\u0430 \u0442\u0440\u0430\u043d\u0437\u0430\u043a\u0446\u0438\u0438 \u043d\u0435 \u0441\u043e\u0432\u043f\u0430\u0434\u0430\u0435\u0442 \u0441 \u0441\u0443\u043c\u043c\u043e\u0439 \u0437\u0430\u043a\u0430\u0437\u0430.',
          genericError: '\u041e\u0448\u0438\u0431\u043a\u0430',
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
      const result = await linkSumupTransactionAction(orderId, selectedId, sumupPaymentMethod);
      if (!result.ok) {
        setError(result.error ?? text.genericError);
      }
    });
  }

  function handleUpdateMethod() {
    setError(null);
    startTransition(async () => {
      const result = await updateLinkedSumupPaymentMethodAction(orderId, sumupPaymentMethod);
      if (!result.ok) {
        setError(result.error ?? text.genericError);
      }
    });
  }

  const methodSelect = (id: string) => (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm font-medium">
        {text.methodLabel}
      </label>
      <select
        id={id}
        value={sumupPaymentMethod}
        onChange={(event) => setSumupPaymentMethod(event.target.value as SumupPaymentMethod)}
        className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="cash">{text.methodCash}</option>
        <option value="ec_card">{text.methodCard}</option>
      </select>
    </div>
  );

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
              - {text.amountDiff}: {formatPrice(diff)}
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
        <div className="space-y-3 rounded-lg border border-green-200 bg-green-50 p-3">
          <div className="text-sm font-semibold text-green-800">{text.linked}</div>
          {renderTransaction(linkedTransaction)}
          {methodSelect('sumup_payment_method_linked')}
          <button
            type="button"
            onClick={handleUpdateMethod}
            disabled={isPending}
            className="w-full rounded-lg border border-green-300 bg-white py-2 text-sm font-medium text-green-700 transition hover:bg-green-100 disabled:opacity-50"
          >
            {isPending ? text.linking : text.updateMethod}
          </button>
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
      ) : candidates.length === 0 ? (
        <p className="text-sm text-neutral-500">{text.noCandidates}</p>
      ) : (
        <div className="space-y-3">
          {methodSelect('sumup_payment_method')}

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
                {formatPrice(Number(transaction.amount))} - {formatDateTime(transaction.paid_at)} -{' '}
                {transaction.receipt_no ?? transaction.transaction_code ?? transaction.id.slice(0, 8)}
              </option>
            ))}
          </select>

          {selectedId && (
            <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
              {renderTransaction(candidates.find((candidate) => candidate.id === selectedId) ?? candidates[0])}
            </div>
          )}

          {amountWarning && (
            <p className="rounded-lg border border-yellow-300 bg-yellow-50 px-3 py-2 text-xs text-yellow-800">
              {text.amountMismatch}
            </p>
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
