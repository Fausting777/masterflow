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
          deleteDisabledTitle: 'Nicht moeglich: Quittung wurde bereits erstellt',
          invoiceLocked:
            'Auftraege mit Quittung bleiben als Buchhaltungsdokument erhalten. Der Papierkorb blendet sie nur in der Oberflaeche aus.',
          deleteHint:
            'Auftraege ohne Quittung koennen erst nach Verschiebung in den Papierkorb und anschliessender bestaetigter Loeschung entfernt werden.',
          permanentDeleteConfirm:
            'Auftrag mit allen Fotos und Dateien endgueltig loeschen?\n\nDieser Schritt kann nicht rueckgaengig gemacht werden.',
        }
      : {
          restoreConfirm: 'Восстановить заказ из корзины?',
          genericError: 'Ошибка',
          restoreLoading: 'Восстановление...',
          restore: 'Восстановить',
          deleteForever: 'Удалить навсегда',
          deleteDisabledTitle: 'Нельзя: квитанция уже создана',
          invoiceLocked:
            'Заказы с квитанцией хранятся как бухгалтерские документы. Корзина только скрывает их из интерфейса.',
          deleteHint:
            'Заказы без квитанции можно удалить только после перемещения в корзину и подтвержденного окончательного удаления.',
          permanentDeleteConfirm:
            'Удалить заказ со всеми фото и файлами навсегда?\n\nЭто действие нельзя отменить.',
        };

  function isRouterError(e: unknown): boolean {
    return e instanceof Error && 'digest' in e;
  }

  function handleRestore() {
    if (!window.confirm(text.restoreConfirm)) return;
    setError(null);
    startTransition(async () => {
      try {
        await restoreOrderAction(orderId);
      } catch (e) {
        if (isRouterError(e)) throw e;
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
        if (isRouterError(e)) throw e;
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
