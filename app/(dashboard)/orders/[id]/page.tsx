import TrashActions from '@/components/orders/TrashActions';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import OrderForm from '@/components/forms/OrderForm';
import OrderStatusSwitcher from '@/components/forms/OrderStatusSwitcher';
import DeleteOrderButton from '@/components/forms/DeleteOrderButton';
import CreateCorrectionButton from '@/components/orders/CreateCorrectionButton';
import PhotoUploader from '@/components/orders/PhotoUploader';
import PhotoGallery from '@/components/orders/PhotoGallery';
import { updateOrderAction } from '../actions';
import { getSignedUrl, getSignedUrls } from '@/lib/supabase/storage';
import PdfSection from '@/components/orders/PdfSection';
import {
  formatPrice,
  formatDateTime,
  STATUS_LABELS,
  STATUS_COLORS,
  PAYMENT_METHOD_LABELS,
} from '@/lib/utils/format';
import type { Order, Client, Service, ActivityLog, OrderPhoto } from '@/types/database';

type Params = Promise<{ id: string }>;
type SearchParams = Promise<{ edit?: string }>;

export default async function OrderPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { id } = await params;
  const { edit } = await searchParams;
  const requestedEdit = edit === '1';

  const supabase = await createClient();

  const { data: order } = await supabase.from('orders').select('*').eq('id', id).maybeSingle();
  if (!order) notFound();

  const o = order as Order;
  const isInvoiceLocked = Boolean(o.invoice_number || o.invoice_locked_at);
  const isEditing = requestedEdit && !isInvoiceLocked;

  const [
    clientRes,
    serviceRes,
    logsRes,
    photosRes,
    clientsListRes,
    servicesListRes,
    profileRes,
    correctionSourceRes,
    correctionsRes,
  ] = await Promise.all([
    supabase.from('clients').select('*').eq('id', o.client_id).maybeSingle(),
    o.service_id
      ? supabase.from('services').select('*').eq('id', o.service_id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from('activity_logs')
      .select('*')
      .eq('order_id', o.id)
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('order_photos')
      .select('*')
      .eq('order_id', o.id)
      .order('created_at', { ascending: true }),
    isEditing ? supabase.from('clients').select('*').order('full_name') : Promise.resolve({ data: [] }),
    isEditing ? supabase.from('services').select('*').order('title') : Promise.resolve({ data: [] }),
    supabase.from('profiles').select('full_name, company_name').eq('id', o.user_id).maybeSingle(),
    o.correction_of_order_id
      ? supabase.from('orders').select('id, invoice_number').eq('id', o.correction_of_order_id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from('orders').select('id, invoice_number, created_at').eq('correction_of_order_id', o.id).order('created_at', { ascending: false }),
  ]);

  const client = clientRes.data as Client | null;
  const service = serviceRes.data as Service | null;
  const logs = (logsRes.data ?? []) as ActivityLog[];
  const photos = (photosRes.data ?? []) as OrderPhoto[];
  const masterProfile = profileRes.data as {
    full_name: string | null;
    company_name: string | null;
  } | null;
  const correctionSource = correctionSourceRes.data as Pick<Order, 'id' | 'invoice_number'> | null;
  const corrections = (correctionsRes.data ?? []) as Array<Pick<Order, 'id' | 'invoice_number' | 'created_at'>>;

  const photoPaths = photos.map((p) => p.file_path);
  const photoSignedUrls = await getSignedUrls(supabase, 'order-photos', photoPaths);
  const photoUrlMap = new Map(photoSignedUrls.map((s) => [s.path, s.url]));

  const beforePhotos = photos
    .filter((p) => p.photo_type === 'before')
    .map((p) => ({ id: p.id, url: photoUrlMap.get(p.file_path) ?? null }));
  const afterPhotos = photos
    .filter((p) => p.photo_type === 'after')
    .map((p) => ({ id: p.id, url: photoUrlMap.get(p.file_path) ?? null }));

  const signatureUrl = o.signature_file_path
    ? await getSignedUrl(supabase, 'order-signatures', o.signature_file_path)
    : null;

  const serviceTitle = service?.title ?? o.custom_service_title ?? '—';
  const priceToShow = o.custom_price ?? service?.default_price ?? null;
  const boundUpdate = updateOrderAction.bind(null, o.id);

  return (
    <div className="max-w-2xl">
      <div className="mb-4">
        <Link href="/orders" className="text-sm text-neutral-500 hover:text-neutral-700">
          ← Назад к списку
        </Link>
      </div>

      {isEditing ? (
        <>
          <h1 className="text-2xl font-semibold mb-4">Редактировать заказ</h1>
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5">
            <OrderForm
              action={boundUpdate}
              clients={(clientsListRes.data ?? []) as Client[]}
              services={(servicesListRes.data ?? []) as Service[]}
              initial={o}
              cancelHref={`/orders/${o.id}`}
              submitLabel="Сохранить"
            />
          </div>
        </>
      ) : (
        <>
          {requestedEdit && isInvoiceLocked && (
            <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              Редактирование заказа отключено: счет уже выпущен и исходные данные зафиксированы.
            </div>
          )}

          {isInvoiceLocked && (
            <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
              Этот заказ находится в режиме архивного счета. Исходные поля, подпись и фото больше нельзя
              менять обычным редактированием.
            </div>
          )}

          {o.correction_of_order_id && (
            <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              Это корректировка к счету{' '}
              {correctionSource?.invoice_number ? (
                <Link href={`/orders/${correctionSource.id}`} className="font-medium underline">
                  {correctionSource.invoice_number}
                </Link>
              ) : (
                'исходного документа'
              )}
              .
              {o.correction_reason && <div className="mt-2 text-xs">Причина: {o.correction_reason}</div>}
            </div>
          )}

          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[o.status]}`}>
                  {STATUS_LABELS[o.status]}
                </span>
              </div>
              <h1 className="text-2xl font-semibold truncate">{serviceTitle}</h1>
              {o.deleted_at && (
                <div className="mt-2 text-xs bg-red-100 text-red-800 inline-block px-2 py-1 rounded font-medium">
                  🗑 В корзине
                </div>
              )}
            </div>
            {!isInvoiceLocked && (
              <Link
                href={`/orders/${o.id}?edit=1`}
                className="rounded-lg border border-neutral-300 dark:border-neutral-700 text-sm font-medium px-4 py-2 hover:bg-neutral-50 dark:hover:bg-neutral-800 whitespace-nowrap"
              >
                Редактировать
              </Link>
            )}
          </div>

          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 mb-4">
            <div className="text-sm text-neutral-500 mb-2">Сменить статус</div>
            <OrderStatusSwitcher orderId={o.id} currentStatus={o.status} />
          </div>

          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 space-y-3 mb-4">
            <Row
              label="Клиент"
              value={
                client ? (
                  <Link href={`/clients/${client.id}`} className="text-blue-600 hover:underline">
                    {client.full_name}
                  </Link>
                ) : (
                  '—'
                )
              }
            />
            {client?.phone && (
              <Row
                label="Телефон клиента"
                value={
                  <a href={`tel:${client.phone}`} className="text-blue-600 hover:underline">
                    {client.phone}
                  </a>
                }
              />
            )}
            <Row label="Цена" value={<span className="font-semibold">{formatPrice(priceToShow)}</span>} />
            {o.payment_method && (
              <Row label="Способ оплаты" value={PAYMENT_METHOD_LABELS[o.payment_method]} />
            )}
            <Row label="Адрес работы" value={o.order_address ?? client?.address ?? '—'} />
            <Row label="Запланирован" value={formatDateTime(o.scheduled_at)} />
            <Row
              label="Дата выполнения"
              value={
                o.service_date ? (
                  formatDateTime(o.service_date)
                ) : (
                  <span className="text-neutral-400 italic">не указана</span>
                )
              }
            />
            {o.completed_at && <Row label="Завершен" value={formatDateTime(o.completed_at)} />}
            {o.invoice_number && (
              <Row label="Номер счета" value={<span className="font-mono font-semibold">{o.invoice_number}</span>} />
            )}
            {o.invoice_sent_at && (
              <Row
                label="Счет отправлен"
                value={
                  <span className="text-xs">
                    {formatDateTime(o.invoice_sent_at)}
                    {o.invoice_sent_to && (
                      <>
                        <br />
                        на {o.invoice_sent_to}
                      </>
                    )}
                  </span>
                }
              />
            )}
            <Row label="Создан" value={formatDateTime(o.created_at)} />
            {o.description && (
              <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800">
                <div className="text-sm text-neutral-500 mb-1">Описание</div>
                <p className="text-sm whitespace-pre-wrap">{o.description}</p>
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 mb-4">
            <h2 className="text-sm font-medium text-neutral-500 mb-3">Фото до работы</h2>
            <div className="mb-3">
              <PhotoGallery photos={beforePhotos} />
            </div>
            {!isInvoiceLocked && (
              <PhotoUploader orderId={o.id} photoType="before" label="Добавить фото «до»" />
            )}
          </div>

          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 mb-4">
            <h2 className="text-sm font-medium text-neutral-500 mb-3">Фото после работы</h2>
            <div className="mb-3">
              <PhotoGallery photos={afterPhotos} />
            </div>
            {!isInvoiceLocked && (
              <PhotoUploader orderId={o.id} photoType="after" label="Добавить фото «после»" />
            )}
          </div>

          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 mb-4">
            <h2 className="text-sm font-medium text-neutral-500 mb-3">Подпись клиента</h2>
            {signatureUrl ? (
              <div>
                <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white overflow-hidden mb-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={signatureUrl} alt="Подпись клиента" className="w-full" />
                </div>
                {!isInvoiceLocked && (
                  <Link href={`/orders/${o.id}/signature`} className="text-sm text-blue-600 hover:underline">
                    Переподписать
                  </Link>
                )}
              </div>
            ) : (
              !isInvoiceLocked && (
                <Link
                  href={`/orders/${o.id}/signature`}
                  className="inline-flex items-center justify-center w-full rounded-lg border border-dashed border-neutral-300 dark:border-neutral-700 px-4 py-3 text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:border-blue-500 hover:text-blue-600 transition"
                >
                  ✍️ Получить подпись клиента
                </Link>
              )
            )}
          </div>

          <div className="bg-white border border-neutral-200 rounded-xl p-5 mb-4">
            <h2 className="text-sm font-medium text-neutral-500 mb-3">PDF-счет</h2>
            <PdfSection
              orderId={o.id}
              hasPdf={!!o.pdf_file_path}
              invoiceNumber={o.invoice_number}
              clientEmail={client?.email ?? null}
              clientName={client?.full_name ?? 'Kunde'}
              masterName={masterProfile?.full_name ?? masterProfile?.company_name ?? 'Мастер'}
              invoiceSentAt={o.invoice_sent_at}
              invoiceSentTo={o.invoice_sent_to}
            />
            {isInvoiceLocked && !o.correction_of_order_id && (
              <div className="mt-3">
                <CreateCorrectionButton orderId={o.id} />
              </div>
            )}
          </div>

          {corrections.length > 0 && (
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 mb-4">
              <h2 className="text-sm font-medium text-neutral-500 mb-3">Корректировки</h2>
              <ul className="space-y-2">
                {corrections.map((correction) => (
                  <li key={correction.id} className="text-sm">
                    <Link href={`/orders/${correction.id}`} className="text-blue-600 hover:underline">
                      {correction.invoice_number ?? 'Черновик корректировки'}
                    </Link>{' '}
                    <span className="text-neutral-500">
                      от {formatDateTime(correction.created_at)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {logs.length > 0 && (
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 mb-4">
              <h2 className="text-sm font-medium text-neutral-500 mb-3">История</h2>
              <ul className="space-y-2">
                {logs.map((l) => (
                  <li key={l.id} className="text-sm flex items-start gap-3">
                    <span className="text-xs text-neutral-400 whitespace-nowrap mt-0.5">
                      {formatDateTime(l.created_at)}
                    </span>
                    <span>{l.action_text ?? l.action_type}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {o.deleted_at ? (
            <div className="bg-red-50 border border-red-200 rounded-xl p-5">
              <div className="flex items-start gap-2 mb-3">
                <span className="text-xl">🗑</span>
                <div>
                  <div className="font-medium text-red-900">Заказ в корзине</div>
                  <div className="text-xs text-red-700 mt-0.5">
                    Удален {new Date(o.deleted_at).toLocaleString('ru-RU')}
                  </div>
                </div>
              </div>
              <TrashActions orderId={o.id} hasInvoice={!!o.invoice_number} />
            </div>
          ) : (
            <DeleteOrderButton orderId={o.id} />
          )}
        </>
      )}
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
