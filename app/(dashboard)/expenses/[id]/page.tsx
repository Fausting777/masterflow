import Link from 'next/link';
import { notFound } from 'next/navigation';
import ExpenseActions from '@/components/expenses/ExpenseActions';
import { getDictionary } from '@/lib/i18n/server';
import { createClient } from '@/lib/supabase/server';
import {
  EXPENSE_CATEGORY_COLORS,
  formatDate,
  formatDateTime,
  formatPrice,
  getExpenseCategoryEmoji,
  getExpenseCategoryLabel,
} from '@/lib/utils/format';
import type { Expense } from '@/types/database';

type Params = Promise<{ id: string }>;

export default async function ExpensePage({ params }: { params: Params }) {
  const { id } = await params;
  const { locale, t } = await getDictionary();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: expense } = await supabase
    .from('expenses')
    .select('*')
    .eq('id', id)
    .eq('user_id', user!.id)
    .maybeSingle();

  if (!expense) notFound();
  const e = expense as Expense;

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

  let receiptUrl: string | null = null;
  if (e.receipt_file_path) {
    const { data: signed } = await supabase.storage
      .from('receipts')
      .createSignedUrl(e.receipt_file_path, 300);
    receiptUrl = signed?.signedUrl ?? null;
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-4">
        <Link href="/expenses" className="text-sm text-neutral-500 hover:text-neutral-700">
          ← {t.expensesPage.detailsBack}
        </Link>
      </div>

      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${EXPENSE_CATEGORY_COLORS[e.category]}`}
            >
              {getExpenseCategoryEmoji(e.category)} {getExpenseCategoryLabel(e.category, locale)}
            </span>
            {e.tax_deductible ? (
              <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                {t.expensesPage.deductibleYes}
              </span>
            ) : (
              <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-600">
                {t.expensesPage.deductibleNo}
              </span>
            )}
          </div>
          <h1 className="truncate text-2xl font-semibold">
            {e.vendor ?? t.expensesPage.detailsTitle}
          </h1>
          {e.deleted_at && (
            <div className="mt-2 inline-block rounded bg-red-100 px-2 py-1 text-xs font-medium text-red-800">
              {t.expensesPage.inTrash}
            </div>
          )}
        </div>
        <Link
          href={`/expenses/${e.id}/edit`}
          className="whitespace-nowrap rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium hover:bg-neutral-50"
        >
          {t.expensesPage.edit}
        </Link>
      </div>

      <div className="mb-4 space-y-3 rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
        <Row
          label={t.expensesPage.amount}
          value={<span className="text-lg font-bold text-rose-700">{formatPrice(Number(e.amount))}</span>}
        />
        <Row label={t.expensesPage.expenseDate} value={formatDate(e.expense_date, locale)} />
        {e.vendor && <Row label={t.expensesPage.vendor} value={e.vendor} />}
        {e.description && (
          <div className="border-t border-neutral-100 pt-2">
            <div className="mb-1 text-sm text-neutral-500">{t.expensesPage.description}</div>
            <p className="whitespace-pre-wrap text-sm">{e.description}</p>
          </div>
        )}
      </div>

      {orderInfo && (
        <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 p-4">
          <div className="mb-2 text-xs uppercase tracking-wide text-neutral-500">
            {t.expensesPage.linkedOrder}
          </div>
          <Link href={`/orders/${orderInfo.id}`} className="-mx-2 block rounded p-2 hover:bg-blue-100/50">
            <div className="font-medium">{orderInfo.client_name}</div>
            <div className="text-sm text-neutral-600">
              {orderInfo.service_title} · {formatDate(orderInfo.created_at, locale)}
            </div>
          </Link>
        </div>
      )}

      <div className="mb-4 rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
        <h2 className="mb-3 text-sm font-medium text-neutral-500">{t.expensesPage.receiptPhoto}</h2>
        {receiptUrl ? (
          <a href={receiptUrl} target="_blank" rel="noopener noreferrer" className="block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={receiptUrl}
              alt={t.expensesPage.receiptAlt}
              className="max-h-96 rounded-lg border border-neutral-200 transition hover:opacity-90"
            />
            <p className="mt-2 text-xs text-neutral-500">{t.expensesPage.openFullSize}</p>
          </a>
        ) : (
          <div className="text-sm italic text-neutral-400">{t.expensesPage.noReceipt}</div>
        )}
      </div>

      <div className="mb-4 space-y-2 rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex justify-between text-xs text-neutral-500">
          <span>{t.expensesPage.createdAt}:</span>
          <span>{formatDateTime(e.created_at, locale)}</span>
        </div>
        {e.updated_at !== e.created_at && (
          <div className="flex justify-between text-xs text-neutral-500">
            <span>{t.expensesPage.updatedAt}:</span>
            <span>{formatDateTime(e.updated_at, locale)}</span>
          </div>
        )}
      </div>

      <ExpenseActions expenseId={e.id} isDeleted={Boolean(e.deleted_at)} />
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-sm text-neutral-500">{label}</dt>
      <dd className="text-right text-sm">{value}</dd>
    </div>
  );
}
