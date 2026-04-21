import Link from 'next/link';
import { notFound } from 'next/navigation';
import ExpenseForm from '@/components/forms/ExpenseForm';
import { getDictionary } from '@/lib/i18n/server';
import { createClient } from '@/lib/supabase/server';
import type { Expense } from '@/types/database';
import { updateExpenseAction } from '../../actions';

type Params = Promise<{ id: string }>;

export default async function EditExpensePage({ params }: { params: Params }) {
  const { id } = await params;
  const { t } = await getDictionary();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: expense } = await supabase.from('expenses').select('*').eq('id', id).eq('user_id', user!.id).maybeSingle();
  if (!expense) notFound();
  const e = expense as Expense;

  const { data: ordersRaw } = await supabase
    .from('orders')
    .select('id, client_id, custom_service_title, service_id, created_at')
    .eq('user_id', user!.id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(50);

  const orders = ordersRaw ?? [];
  const clientIds = [...new Set(orders.map((o) => o.client_id))];
  const clientNames = new Map<string, string>();
  if (clientIds.length > 0) {
    const { data: clients } = await supabase.from('clients').select('id, full_name').in('id', clientIds);
    for (const c of clients ?? []) clientNames.set(c.id, c.full_name);
  }

  const serviceIds = [...new Set(orders.filter((o) => o.service_id).map((o) => o.service_id!))];
  const serviceNames = new Map<string, string>();
  if (serviceIds.length > 0) {
    const { data: services } = await supabase.from('services').select('id, title').in('id', serviceIds);
    for (const s of services ?? []) serviceNames.set(s.id, s.title);
  }

  const orderOptions = orders.map((o) => ({
    id: o.id,
    client_name: clientNames.get(o.client_id) ?? '—',
    service_title: o.service_id ? serviceNames.get(o.service_id) ?? '—' : o.custom_service_title ?? '—',
    created_at: o.created_at,
  }));

  let receiptPreviewUrl: string | null = null;
  if (e.receipt_file_path) {
    const { data: signedUrl } = await supabase.storage.from('receipts').createSignedUrl(e.receipt_file_path, 300);
    receiptPreviewUrl = signedUrl?.signedUrl ?? null;
  }

  const boundUpdate = updateExpenseAction.bind(null, id);

  return (
    <div className="max-w-2xl">
      <div className="mb-4">
        <Link href="/expenses" className="text-sm text-neutral-500 hover:text-neutral-700">
          ← {t.expensesPage.detailsBack}
        </Link>
      </div>

      <h1 className="text-2xl font-semibold mb-4">{t.expensesPage.editTitle}</h1>

      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5">
        <ExpenseForm
          action={boundUpdate}
          initial={e}
          receiptPreviewUrl={receiptPreviewUrl}
          orders={orderOptions}
          cancelHref="/expenses"
          submitLabel={t.orderPage.save}
        />
      </div>
    </div>
  );
}
