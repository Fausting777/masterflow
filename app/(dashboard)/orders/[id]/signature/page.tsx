import Link from 'next/link';
import { notFound } from 'next/navigation';
import SignaturePad from '@/components/orders/SignaturePad';
import { getDictionary } from '@/lib/i18n/server';
import { createClient } from '@/lib/supabase/server';

type Params = Promise<{ id: string }>;

export default async function SignaturePage({ params }: { params: Params }) {
  const { id } = await params;
  const { locale } = await getDictionary();

  const text =
    locale === 'de'
      ? {
          back: 'Zurueck zum Auftrag',
          title: 'Kundenunterschrift',
          introTitle: 'Auftragsbestaetigung / Leistungsbestaetigung',
          introLine1:
            'Mit meiner Unterschrift bestaetige ich, dass die oben genannten Leistungen fachgerecht und zu meiner Zufriedenheit erbracht wurden.',
          introLine2:
            'Ich erkenne den Rechnungsbetrag an und bestaetige die vereinbarte Zahlungsart.',
        }
      : {
          back: 'Назад к заказу',
          title: 'Подпись клиента',
          introTitle: 'Подтверждение заказа / выполненных работ',
          introLine1:
            'Моей подписью я подтверждаю, что указанные выше работы выполнены качественно и к моему удовлетворению.',
          introLine2:
            'Я признаю сумму счёта и обязуюсь оплатить её согласно согласованному способу оплаты.',
        };

  const supabase = await createClient();
  const { data: order } = await supabase
    .from('orders')
    .select('id, client_id')
    .eq('id', id)
    .maybeSingle();

  if (!order) notFound();

  const { data: client } = await supabase
    .from('clients')
    .select('full_name')
    .eq('id', order.client_id)
    .maybeSingle();

  return (
    <div className="max-w-2xl">
      <div className="mb-4">
        <Link href={`/orders/${id}`} className="text-sm text-neutral-500 hover:text-neutral-700">
          ← {text.back}
        </Link>
      </div>

      <h1 className="mb-1 text-2xl font-semibold">{text.title}</h1>
      {client && <p className="mb-4 text-sm text-neutral-500">{client.full_name}</p>}

      <div className="mb-4 space-y-2 rounded-xl border border-blue-200 bg-blue-50 p-4">
        <div className="text-sm font-semibold text-blue-900">{text.introTitle}</div>
        <p className="text-sm leading-relaxed text-neutral-800">{text.introLine1}</p>
        <p className="text-sm leading-relaxed text-neutral-800">{text.introLine2}</p>
      </div>

      <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
        <SignaturePad orderId={id} />
      </div>
    </div>
  );
}
