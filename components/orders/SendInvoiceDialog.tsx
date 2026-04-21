'use client';

import { useEffect, useState, useTransition } from 'react';
import { sendInvoiceEmailAction } from '@/app/(dashboard)/orders/[id]/email/actions';
import { useI18n } from '@/components/i18n/LocaleProvider';

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
  const { locale } = useI18n();
  const text =
    locale === 'de'
      ? {
          title: 'Quittung per E-Mail senden',
          close: 'Schließen',
          success: 'E-Mail wurde gesendet',
          recipient: 'Empfänger (E-Mail)',
          missingClientEmail:
            'Beim Kunden ist keine E-Mail hinterlegt. Füge sie in der Kundenkarte hinzu oder trage sie hier manuell ein.',
          subjectLabel: 'Betreff',
          bodyLabel: 'Nachricht',
          attachmentHint:
            'Die PDF-Quittung wird automatisch angehängt.\nAntworten des Kunden gehen an deine hinterlegte E-Mail-Adresse.',
          cancel: 'Abbrechen',
          send: 'Senden',
          sending: 'Wird gesendet...',
          genericError: 'Fehler beim Senden',
          defaultSubject: invoiceNumber
            ? `Quittung ${invoiceNumber}`
            : 'Quittung für erbrachte Leistung',
          defaultBody: `Sehr geehrte/r ${clientName},

anbei finden Sie die Quittung für die erbrachte Leistung.

Bei Fragen melden Sie sich bitte gerne bei mir.

Mit freundlichen Grüßen
${masterName}`,
        }
      : {
          title: 'Отправить квитанцию на email',
          close: 'Закрыть',
          success: 'Письмо отправлено',
          recipient: 'Кому (email)',
          missingClientEmail:
            'У клиента нет email. Добавь его в карточке клиента или подставь сам.',
          subjectLabel: 'Тема',
          bodyLabel: 'Текст письма',
          attachmentHint:
            'PDF-квитанция будет вложена автоматически.\nОтветы от клиента придут на твой email.',
          cancel: 'Отмена',
          send: 'Отправить',
          sending: 'Отправка...',
          genericError: 'Ошибка отправки',
          defaultSubject: invoiceNumber
            ? `Квитанция ${invoiceNumber}`
            : 'Квитанция за выполненную работу',
          defaultBody: `Здравствуйте, ${clientName}.

Во вложении квитанция за выполненную работу.

Если появятся вопросы, пожалуйста, свяжитесь со мной.

С уважением
${masterName}`,
        };

  const [to, setTo] = useState(clientEmail ?? '');
  const [subject, setSubject] = useState(text.defaultSubject);
  const [body, setBody] = useState(text.defaultBody);
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
        setError(res.error ?? text.genericError);
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
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-neutral-200 p-5">
          <h2 className="font-semibold">{text.title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-neutral-100"
            aria-label={text.close}
          >
            ×
          </button>
        </div>

        <div className="space-y-4 p-5">
          {success ? (
            <div className="py-6 text-center">
              <div className="mb-3 text-4xl">✓</div>
              <div className="font-medium">{text.success}</div>
              <div className="mt-1 text-sm text-neutral-500">
                {locale === 'de' ? 'Gesendet an:' : 'Отправлено:'} {to}
              </div>
            </div>
          ) : (
            <>
              <div>
                <label htmlFor="to" className="mb-1 block text-sm font-medium">
                  {text.recipient} <span className="text-red-500">*</span>
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
                  <p className="mt-1 text-xs text-amber-600">{text.missingClientEmail}</p>
                )}
              </div>

              <div>
                <label htmlFor="subject" className="mb-1 block text-sm font-medium">
                  {text.subjectLabel} <span className="text-red-500">*</span>
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
                <label htmlFor="body" className="mb-1 block text-sm font-medium">
                  {text.bodyLabel}
                </label>
                <textarea
                  id="body"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={8}
                  className={`${inputCls} resize-y`}
                />
              </div>

              <div className="rounded-lg bg-neutral-50 p-3 text-xs text-neutral-500">
                {text.attachmentHint.split('\n').map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </div>

              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </div>
              )}
            </>
          )}
        </div>

        {!success && (
          <div className="flex gap-2 border-t border-neutral-200 p-5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-neutral-300 px-4 py-2.5 text-sm font-medium hover:bg-neutral-50"
            >
              {text.cancel}
            </button>
            <button
              type="button"
              onClick={handleSend}
              disabled={isPending || !to || !subject || !body}
              className="flex-1 rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:bg-blue-400"
            >
              {isPending ? text.sending : text.send}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
