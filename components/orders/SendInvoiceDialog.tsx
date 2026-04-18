'use client';

import { useEffect, useState, useTransition } from 'react';
import { sendInvoiceEmailAction } from '@/app/(dashboard)/orders/[id]/email/actions';

type Props = {
  orderId: string;
  invoiceNumber: string | null;
  clientEmail: string | null;
  clientName: string;
  masterName: string;
  onClose: () => void;
};

export default function SendInvoiceDialog({
  orderId,
  invoiceNumber,
  clientEmail,
  clientName,
  masterName,
  onClose,
}: Props) {
  const [to, setTo] = useState(clientEmail ?? '');
  const [subject, setSubject] = useState(
    invoiceNumber
      ? `Rechnung ${invoiceNumber}`
      : 'Rechnung für erbrachte Leistung'
  );
  const [body, setBody] = useState(
    `Sehr geehrte/r ${clientName},

anbei finden Sie die Rechnung für die erbrachte Leistung.

Bei Fragen melden Sie sich bitte gerne bei mir.

Mit freundlichen Grüßen
${masterName}`
  );

  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  function handleSend() {
    setError(null);
    startTransition(async () => {
      const res = await sendInvoiceEmailAction({ orderId, to, subject, body });
      if (res.ok) {
        setSuccess(true);
        setTimeout(onClose, 1500);
      } else {
        setError(res.error ?? 'Ошибка отправки');
      }
    });
  }

  const inputCls =
    'w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b border-neutral-200 flex items-center justify-between">
          <h2 className="font-semibold">Отправить счёт на email</h2>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-neutral-100"
            aria-label="Закрыть"
          >
            ✕
          </button>
        </div>

        <div className="p-5 space-y-4">
          {success ? (
            <div className="text-center py-6">
              <div className="text-4xl mb-3">✅</div>
              <div className="font-medium">Письмо отправлено</div>
              <div className="text-sm text-neutral-500 mt-1">Получатель: {to}</div>
            </div>
          ) : (
            <>
              <div>
                <label htmlFor="to" className="block text-sm font-medium mb-1">
                  Кому (email) <span className="text-red-500">*</span>
                </label>
                <input
                  id="to"
                  type="email"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className={inputCls}
                  placeholder="kunde@example.com"
                />
                {!clientEmail && (
                  <p className="text-xs text-amber-600 mt-1">
                    ⚠️ У клиента нет email — добавь его в карточку клиента, чтобы подставлялся сам
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="subject" className="block text-sm font-medium mb-1">
                  Тема <span className="text-red-500">*</span>
                </label>
                <input
                  id="subject"
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className={inputCls}
                />
              </div>

              <div>
                <label htmlFor="body" className="block text-sm font-medium mb-1">
                  Текст письма
                </label>
                <textarea
                  id="body"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={8}
                  className={`${inputCls} resize-y`}
                />
              </div>

              <div className="text-xs text-neutral-500 bg-neutral-50 rounded-lg p-3">
                📎 PDF-счёт будет вложен автоматически.<br />
                📬 Ответы от клиента придут на твой email.
              </div>

              {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
                  {error}
                </div>
              )}
            </>
          )}
        </div>

        {!success && (
          <div className="p-5 border-t border-neutral-200 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-neutral-300 px-4 py-2.5 text-sm font-medium hover:bg-neutral-50"
            >
              Отмена
            </button>
            <button
              type="button"
              onClick={handleSend}
              disabled={isPending || !to || !subject || !body}
              className="flex-1 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2.5 text-sm transition"
            >
              {isPending ? 'Отправка...' : '📧 Отправить'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}