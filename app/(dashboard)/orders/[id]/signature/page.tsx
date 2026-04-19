import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import SignaturePad from '@/components/orders/SignaturePad';

type Params = Promise<{ id: string }>;

export default async function SignaturePage({ params }: { params: Params }) {
  const { id } = await params;

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
          ← Назад к заказу
        </Link>
      </div>

      <h1 className="text-2xl font-semibold mb-1">Подпись клиента</h1>
      {client && (
        <p className="text-sm text-neutral-500 mb-4">{client.full_name}</p>
      )}

      {/* Немецкий текст подтверждения — клиент читает ПЕРЕД подписью */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4 space-y-2">
        <div className="font-semibold text-blue-900 text-sm">
          Auftragsbestätigung / Leistungsbestätigung
        </div>
        <p className="text-sm text-neutral-800 leading-relaxed">
          Mit meiner Unterschrift bestätige ich, dass die oben genannten Leistungen fachgerecht und zu meiner Zufriedenheit erbracht wurden.
        </p>
        <p className="text-sm text-neutral-800 leading-relaxed">
          Ich erkenne den Rechnungsbetrag an und verpflichte mich zur Zahlung gemäß der vereinbarten Zahlungsart.
        </p>
      </div>

      {/* Поле подписи */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5">
        <SignaturePad orderId={id} />
      </div>
    </div>
  );
}