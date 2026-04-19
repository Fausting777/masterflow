import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import {
  formatPrice,
  EXPENSE_CATEGORY_LABELS,
  EXPENSE_CATEGORY_EMOJIS,
  EXPENSE_CATEGORY_COLORS,
} from '@/lib/utils/format';
import ExpenseActions from '@/components/expenses/ExpenseActions';
import type { Expense } from '@/types/database';

type Params = Promise<{ id: string }>;

export default async function ExpensePage({ params }: { params: Params }) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: expense } = await supabase
    .from('expenses')
    .select('*')
    .eq('id', id)
    .eq('user_id', user!.id)
    .maybeSingle();

  if (!expense) notFound();
  const e = expense as Expense;

  // Связанный заказ (если привязан)
  let orderInfo: { id: string; client_name: string; service_title: string; created_at: string } | null = null;
  if (e.order_id) {
    const { data: order } = await supabase
      .from('orders')
      .select('id, client_id, service_id, custom_service_title, created_at')
      .eq('id', e.order_id)
      .maybeSingle();

    if (order) {
      const { data: client } = await supabase
        .from('clients')
        .select('full_name')
        .eq('id', order.client_id)
        .maybeSingle();

      let serviceTitle = order.custom_service_title ?? '—';
      if (order.service_id) {
        const { data: service } = await supabase
          .from('services')
          .select('title')
          .eq('id', order.service_id)
          .maybeSingle();
        if (service) serviceTitle = service.title;
      }

      orderInfo = {
        id: order.id,
        client_name: client?.full_name ?? '—',
        service_title: serviceTitle,
        created_at: order.created_at,
      };
    }
  }

  // Signed URL для чека
  let receiptUrl: string | null = null;
  if (e.receipt_file_path) {
    const { data: signed } = await supabase.storage
      .from('receipts')
      .createSignedUrl(e.receipt_file_path, 300);
    receiptUrl = signed?.signedUrl ?? null;
  }

  const dateLabel = new Date(e.expense_date).toLocaleDateString('de-DE');

  return (
    <div className="max-w-2xl">
      <div className="mb-4">
        <Link href="/expenses" className="text-sm text-neutral-500 hover:text-neutral-700">
          ← К расходам
        </Link>
      </div>

      {/* Шапка */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${EXPENSE_CATEGORY_COLORS[e.category]}`}>
              {EXPENSE_CATEGORY_EMOJIS[e.category]} {EXPENSE_CATEGORY_LABELS[e.category]}
            </span>
            {e.tax_deductible ? (
              <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full font-medium">
                ✓ Налог. вычет
              </span>
            ) : (
              <span className="text-xs bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-full font-medium">
                ⊘ Без вычета
              </span>
            )}
          </div>
          <h1 className="text-2xl font-semibold truncate">
            {e.vendor ?? 'Расход'}
          </h1>
          {e.deleted_at && (
            <div className="mt-2 text-xs bg-red-100 text-red-800 inline-block px-2 py-1 rounded font-medium">
              🗑 В корзине
            </div>
          )}
        </div>
        <Link
          href={`/expenses/${e.id}/edit`}
          className="rounded-lg border border-neutral-300 text-sm font-medium px-4 py-2 hover:bg-neutral-50 whitespace-nowrap"
        >
          Редактировать
        </Link>
      </div>

      {/* Основная информация */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 space-y-3 mb-4">
        <Row
          label="Сумма"
          value={<span className="text-lg font-bold text-rose-700">{formatPrice(Number(e.amount))}</span>}
        />
        <Row label="Дата расхода" value={dateLabel} />
        {e.vendor && <Row label="Продавец / Получатель" value={e.vendor} />}
        {e.description && (
          <div className="pt-2 border-t border-neutral-100">
            <div className="text-sm text-neutral-500 mb-1">Описание</div>
            <p className="text-sm whitespace-pre-wrap">{e.description}</p>
          </div>
        )}
      </div>

      {/* Связанный заказ */}
      {orderInfo && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
          <div className="text-xs text-neutral-500 uppercase tracking-wide mb-2">
            🔗 Связан с заказом
          </div>
          <Link
            href={`/orders/${orderInfo.id}`}
            className="block hover:bg-blue-100/50 rounded p-2 -mx-2"
          >
            <div className="font-medium">{orderInfo.client_name}</div>
            <div className="text-sm text-neutral-600">
              {orderInfo.service_title} · {new Date(orderInfo.created_at).toLocaleDateString('de-DE')}
            </div>
          </Link>
        </div>
      )}

      {/* Чек */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 mb-4">
        <h2 className="text-sm font-medium text-neutral-500 mb-3">Фото чека</h2>
        {receiptUrl ? (
          <a href={receiptUrl} target="_blank" rel="noopener noreferrer" className="block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={receiptUrl}
              alt="Чек"
              className="max-h-96 rounded-lg border border-neutral-200 hover:opacity-90 transition"
            />
            <p className="text-xs text-neutral-500 mt-2">Нажми чтобы открыть в полном размере</p>
          </a>
        ) : (
          <div className="text-sm text-neutral-400 italic">Чек не загружен</div>
        )}
      </div>

      {/* Даты */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 space-y-2 mb-4">
        <div className="flex justify-between text-xs text-neutral-500">
          <span>Создан:</span>
          <span>{new Date(e.created_at).toLocaleString('de-DE')}</span>
        </div>
        {e.updated_at !== e.created_at && (
          <div className="flex justify-between text-xs text-neutral-500">
            <span>Обновлён:</span>
            <span>{new Date(e.updated_at).toLocaleString('de-DE')}</span>
          </div>
        )}
      </div>

      {/* Действия */}
      <ExpenseActions expenseId={e.id} isDeleted={Boolean(e.deleted_at)} />
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-sm text-neutral-500">{label}</dt>
      <dd className="text-sm text-right">{value}</dd>
    </div>
  );
}