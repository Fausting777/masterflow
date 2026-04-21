'use client';

import { useState, useTransition } from 'react';
import {
  permanentDeleteOrderAction,
  restoreOrderAction,
} from '@/app/(dashboard)/orders/actions';
import { useI18n } from '@/components/i18n/LocaleProvider';

type Props = {
  orderId: string;
  hasInvoice: boolean;
};

export default function TrashActions({ orderId, hasInvoice }: Props) {
  const { locale } = useI18n();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const text =
    locale === 'de'
      ? {
          restoreConfirm: 'Auftrag aus dem Papierkorb wiederherstellen?',
          genericError: 'Fehler',
          restoreLoading: 'Wird wiederhergestellt...',
          restore: 'Wiederherstellen',
          deleteForever: 'Endgueltig loeschen',
          deleteDisabledTitle: 'Nicht moeglich: Rechnung wurde bereits erstellt',
          invoiceLocked:
            'Auftraege mit Rechnung bleiben als Buchhaltungsdokument erhalten. Der Papierkorb blendet sie nur in der Oberflaeche aus.',
          deleteHint:
            'Auftraege ohne Rechnung koennen erst nach Verschiebung in den Papierkorb und anschliessender bestaetigter Loeschung entfernt werden.',
          permanentDeleteConfirm:
            'Auftrag mit allen Fotos und Dateien endgueltig loeschen?\n\nDieser Schritt kann nicht rueckgaengig gemacht werden.',
        }
      : {
          restoreConfirm:
            '\u0412\u043e\u0441\u0441\u0442\u0430\u043d\u043e\u0432\u0438\u0442\u044c \u0437\u0430\u043a\u0430\u0437 \u0438\u0437 \u043a\u043e\u0440\u0437\u0438\u043d\u044b?',
          genericError: '\u041e\u0448\u0438\u0431\u043a\u0430',
          restoreLoading:
            '\u0412\u043e\u0441\u0441\u0442\u0430\u043d\u043e\u0432\u043b\u0435\u043d\u0438\u0435...',
          restore: '\u0412\u043e\u0441\u0441\u0442\u0430\u043d\u043e\u0432\u0438\u0442\u044c',
          deleteForever:
            '\u0423\u0434\u0430\u043b\u0438\u0442\u044c \u043d\u0430\u0432\u0441\u0435\u0433\u0434\u0430',
          deleteDisabledTitle:
            '\u041d\u0435\u043b\u044c\u0437\u044f: \u0441\u0447\u0435\u0442 \u0443\u0436\u0435 \u0441\u043e\u0437\u0434\u0430\u043d',
          invoiceLocked:
            '\u0417\u0430\u043a\u0430\u0437\u044b \u0441\u043e \u0441\u0447\u0435\u0442\u043e\u043c \u0445\u0440\u0430\u043d\u044f\u0442\u0441\u044f \u043a\u0430\u043a \u0431\u0443\u0445\u0433\u0430\u043b\u0442\u0435\u0440\u0441\u043a\u0438\u0435 \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u044b. \u041a\u043e\u0440\u0437\u0438\u043d\u0430 \u0442\u043e\u043b\u044c\u043a\u043e \u0441\u043a\u0440\u044b\u0432\u0430\u0435\u0442 \u0438\u0445 \u0438\u0437 \u0438\u043d\u0442\u0435\u0440\u0444\u0435\u0439\u0441\u0430.',
          deleteHint:
            '\u0417\u0430\u043a\u0430\u0437\u044b \u0431\u0435\u0437 \u0441\u0447\u0435\u0442\u0430 \u043c\u043e\u0436\u043d\u043e \u0443\u0434\u0430\u043b\u0438\u0442\u044c \u0442\u043e\u043b\u044c\u043a\u043e \u043f\u043e\u0441\u043b\u0435 \u043f\u0435\u0440\u0435\u043c\u0435\u0449\u0435\u043d\u0438\u044f \u0432 \u043a\u043e\u0440\u0437\u0438\u043d\u0443 \u0438 \u043f\u043e\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043d\u043d\u043e\u0433\u043e \u043e\u043a\u043e\u043d\u0447\u0430\u0442\u0435\u043b\u044c\u043d\u043e\u0433\u043e \u0443\u0434\u0430\u043b\u0435\u043d\u0438\u044f.',
          permanentDeleteConfirm:
            '\u0423\u0434\u0430\u043b\u0438\u0442\u044c \u0437\u0430\u043a\u0430\u0437 \u0441\u043e \u0432\u0441\u0435\u043c\u0438 \u0444\u043e\u0442\u043e \u0438 \u0444\u0430\u0439\u043b\u0430\u043c\u0438 \u043d\u0430\u0432\u0441\u0435\u0433\u0434\u0430?\n\n\u042d\u0442\u043e \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0435 \u043d\u0435\u043b\u044c\u0437\u044f \u043e\u0442\u043c\u0435\u043d\u0438\u0442\u044c.',
        };

  function handleRestore() {
    if (!window.confirm(text.restoreConfirm)) return;
    setError(null);
    startTransition(async () => {
      try {
        await restoreOrderAction(orderId);
      } catch (e) {
        setError(e instanceof Error ? e.message : text.genericError);
      }
    });
  }

  function handlePermanentDelete() {
    if (hasInvoice) {
      setError(text.invoiceLocked);
      return;
    }

    if (!window.confirm(text.permanentDeleteConfirm)) return;

    setError(null);
    startTransition(async () => {
      try {
        await permanentDeleteOrderAction(orderId);
      } catch (e) {
        setError(e instanceof Error ? e.message : text.genericError);
      }
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleRestore}
          disabled={isPending}
          className="flex-1 rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:bg-blue-400"
        >
          {isPending ? text.restoreLoading : text.restore}
        </button>

        <button
          type="button"
          onClick={handlePermanentDelete}
          disabled={isPending || hasInvoice}
          title={hasInvoice ? text.deleteDisabledTitle : ''}
          className="rounded-lg border border-red-300 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {text.deleteForever}
        </button>
      </div>

      {hasInvoice ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
          {text.invoiceLocked}
        </div>
      ) : (
        <p className="text-xs text-neutral-500">{text.deleteHint}</p>
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
