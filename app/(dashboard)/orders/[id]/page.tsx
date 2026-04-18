import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import OrderForm from '@/components/forms/OrderForm';
import OrderStatusSwitcher from '@/components/forms/OrderStatusSwitcher';
import DeleteOrderButton from '@/components/forms/DeleteOrderButton';
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
} from '@/lib/utils/format';
import type {
  Order,
  Client,
  Service,
  ActivityLog,
  OrderPhoto,
} from '@/types/database';

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
  const isEditing = edit === '1';

  const supabase = await createClient();

  const { data: order } = await supabase
    .from('orders')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (!order) notFound();
  const o = order as Order;

  // Все связанные данные параллельно
  const [
    clientRes,
    serviceRes,
    logsRes,
    photosRes,
    clientsListRes,
    servicesListRes,
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
    isEditing
      ? supabase.from('clients').select('*').order('full_name')
      : Promise.resolve({ data: [] }),
    isEditing
      ? supabase.from('services').select('*').order('title')
      : Promise.resolve({ data: [] }),
  ]);

  const client = clientRes.data as Client | null;
  const service = serviceRes.data as Service | null;
  const logs = (logsRes.data ?? []) as ActivityLog[];
  const photos = (photosRes.data ?? []) as OrderPhoto[];

  // Получаем signed URLs одним запросом на бакет
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
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[o.status]}`}>
                  {STATUS_LABELS[o.status]}
                </span>
              </div>
              <h1 className="text-2xl font-semibold truncate">{serviceTitle}</h1>
            </div>
            <Link
              href={`/orders/${o.id}?edit=1`}
              className="rounded-lg border border-neutral-300 dark:border-neutral-700 text-sm font-medium px-4 py-2 hover:bg-neutral-50 dark:hover:bg-neutral-800 whitespace-nowrap"
            >
              Редактировать
            </Link>
          </div>

          {/* Статус */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 mb-4">
            <div className="text-sm text-neutral-500 mb-2">Сменить статус</div>
            <OrderStatusSwitcher orderId={o.id} currentStatus={o.status} />
          </div>

          {/* Основное */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 space-y-3 mb-4">
            <Row label="Клиент" value={
              client ? (
                <Link href={`/clients/${client.id}`} className="text-blue-600 hover:underline">
                  {client.full_name}
                </Link>
              ) : '—'
            } />
            {client?.phone && (
              <Row label="Телефон клиента" value={
                <a href={`tel:${client.phone}`} className="text-blue-600 hover:underline">
                  {client.phone}
                </a>
              } />
            )}
            <Row label="Цена" value={<span className="font-semibold">{formatPrice(priceToShow)}</span>} />
            <Row label="Адрес работы" value={o.order_address ?? client?.address ?? '—'} />
            <Row label="Запланирован" value={formatDateTime(o.scheduled_at)} />
            {o.completed_at && <Row label="Завершён" value={formatDateTime(o.completed_at)} />}
            {o.invoice_number && (
  <Row
    label="Номер счёта"
    value={<span className="font-mono font-semibold">{o.invoice_number}</span>}
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

          {/* ФОТО ДО */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 mb-4">
            <h2 className="text-sm font-medium text-neutral-500 mb-3">Фото до работы</h2>
            <div className="mb-3">
              <PhotoGallery photos={beforePhotos} />
            </div>
            <PhotoUploader orderId={o.id} photoType="before" label="Добавить фото «до»" />
          </div>

          {/* ФОТО ПОСЛЕ */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 mb-4">
            <h2 className="text-sm font-medium text-neutral-500 mb-3">Фото после работы</h2>
            <div className="mb-3">
              <PhotoGallery photos={afterPhotos} />
            </div>
            <PhotoUploader orderId={o.id} photoType="after" label="Добавить фото «после»" />
          </div>

          {/* ПОДПИСЬ */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 mb-4">
            <h2 className="text-sm font-medium text-neutral-500 mb-3">Подпись клиента</h2>
            {signatureUrl ? (
              <div>
                <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white overflow-hidden mb-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={signatureUrl} alt="Подпись клиента" className="w-full" />
                </div>
                <Link
                  href={`/orders/${o.id}/signature`}
                  className="text-sm text-blue-600 hover:underline"
                >
                  Переподписать
                </Link>
              </div>
            ) : (
              <Link
                href={`/orders/${o.id}/signature`}
                className="inline-flex items-center justify-center w-full rounded-lg border border-dashed border-neutral-300 dark:border-neutral-700 px-4 py-3 text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:border-blue-500 hover:text-blue-600 transition"
              >
                ✍️ Получить подпись клиента
              </Link>
            )}
          </div>

          {/* PDF */}
<div className="bg-white border border-neutral-200 rounded-xl p-5 mb-4">
  <h2 className="text-sm font-medium text-neutral-500 mb-3">PDF-счёт</h2>
  <PdfSection orderId={o.id} hasPdf={!!o.pdf_file_path} />
</div>

          {/* История */}
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

          <DeleteOrderButton orderId={o.id} />
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