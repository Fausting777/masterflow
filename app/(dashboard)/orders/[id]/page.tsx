import Link from 'next/link';
import { notFound } from 'next/navigation';
import AuditTrailList from '@/components/audit/AuditTrailList';
import FileIntegrityPanel from '@/components/audit/FileIntegrityPanel';
import TrashActions from '@/components/orders/TrashActions';
import OrderForm from '@/components/forms/OrderForm';
import OrderStatusSwitcher from '@/components/forms/OrderStatusSwitcher';
import DeleteOrderButton from '@/components/forms/DeleteOrderButton';
import CreateCorrectionButton from '@/components/orders/CreateCorrectionButton';
import PhotoUploader from '@/components/orders/PhotoUploader';
import PhotoGallery from '@/components/orders/PhotoGallery';
import PdfSection from '@/components/orders/PdfSection';
import { getDictionary, getLocale } from '@/lib/i18n/server';
import { createClient } from '@/lib/supabase/server';
import { getSignedUrl, getSignedUrls } from '@/lib/supabase/storage';
import { formatPrice, STATUS_COLORS } from '@/lib/utils/format';
import type {
  ActivityLog,
  AuditTrailEntry,
  Client,
  Order,
  OrderPhoto,
  OrderStatus,
  PaymentMethod,
  PaymentProvider,
  Service,
} from '@/types/database';
import { updateOrderAction } from '../actions';

type Params = Promise<{ id: string }>;
type SearchParams = Promise<{ edit?: string; media?: string; history?: string; audit?: string }>;

const DASH = '-';

export default async function OrderPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { id } = await params;
  const { edit, media, history, audit } = await searchParams;
  const requestedEdit = edit === '1';
  const showMedia = media === '1';
  const showHistory = history === '1';
  const showAudit = audit === '1';

  const supabase = await createClient();
  const [{ t }, locale] = await Promise.all([getDictionary(), getLocale()]);

  const { data: order } = await supabase.from('orders').select('*').eq('id', id).maybeSingle();
  if (!order) notFound();

  const o = order as Order;
  const isInvoiceLocked = Boolean(o.invoice_number || o.invoice_locked_at);
  const isEditing = requestedEdit && !isInvoiceLocked;

  const [
    clientRes,
    serviceRes,
    logsRes,
    auditRes,
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
    showHistory
      ? supabase
          .from('activity_logs')
          .select('*')
          .eq('order_id', o.id)
          .order('created_at', { ascending: false })
          .limit(20)
      : Promise.resolve({ data: [] }),
    showAudit
      ? supabase
          .from('audit_trail')
          .select('*')
          .eq('table_name', 'orders')
          .eq('record_id', o.id)
          .order('created_at', { ascending: false })
          .limit(20)
      : Promise.resolve({ data: [] }),
    showMedia
      ? supabase
          .from('order_photos')
          .select('*')
          .eq('order_id', o.id)
          .order('created_at', { ascending: true })
      : Promise.resolve({ data: [] }),
    isEditing ? supabase.from('clients').select('*').order('full_name') : Promise.resolve({ data: [] }),
    isEditing ? supabase.from('services').select('*').order('title') : Promise.resolve({ data: [] }),
    supabase.from('profiles').select('full_name, company_name').eq('id', o.user_id).maybeSingle(),
    o.correction_of_order_id
      ? supabase
          .from('orders')
          .select('id, invoice_number')
          .eq('id', o.correction_of_order_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from('orders')
      .select('id, invoice_number, created_at')
      .eq('correction_of_order_id', o.id)
      .order('created_at', { ascending: false }),
  ]);

  const client = clientRes.data as Client | null;
  const service = serviceRes.data as Service | null;
  const logs = (logsRes.data ?? []) as ActivityLog[];
  const auditEntries = (auditRes.data ?? []) as AuditTrailEntry[];
  const photos = (photosRes.data ?? []) as OrderPhoto[];
  const masterProfile = profileRes.data as {
    full_name: string | null;
    company_name: string | null;
  } | null;
  const correctionSource = correctionSourceRes.data as Pick<Order, 'id' | 'invoice_number'> | null;
  const corrections = (correctionsRes.data ?? []) as Array<
    Pick<Order, 'id' | 'invoice_number' | 'created_at'>
  >;

  const photoPaths = photos.map((p) => p.file_path);
  const photoSignedUrls =
    showMedia && photoPaths.length > 0
      ? await getSignedUrls(supabase, 'order-photos', photoPaths)
      : [];
  const photoUrlMap = new Map(photoSignedUrls.map((s) => [s.path, s.url]));

  const beforePhotos = photos
    .filter((p) => p.photo_type === 'before')
    .map((p) => ({ id: p.id, url: photoUrlMap.get(p.file_path) ?? null }));
  const afterPhotos = photos
    .filter((p) => p.photo_type === 'after')
    .map((p) => ({ id: p.id, url: photoUrlMap.get(p.file_path) ?? null }));

  const signatureUrl =
    showMedia && o.signature_file_path
      ? await getSignedUrl(supabase, 'order-signatures', o.signature_file_path)
      : null;

  const serviceTitle = service?.title ?? o.custom_service_title ?? DASH;
  const priceToShow = o.custom_price ?? service?.default_price ?? null;
  const boundUpdate = updateOrderAction.bind(null, o.id);

  const statusLabels: Record<OrderStatus, string> = {
    new: locale === 'de' ? 'Neu' : '\u041d\u043e\u0432\u044b\u0439',
    in_progress: locale === 'de' ? 'In Arbeit' : '\u0412 \u0440\u0430\u0431\u043e\u0442\u0435',
    completed: locale === 'de' ? 'Abgeschlossen' : '\u0417\u0430\u0432\u0435\u0440\u0448\u0435\u043d',
    canceled: locale === 'de' ? 'Abgebrochen' : '\u041e\u0442\u043c\u0435\u043d\u0435\u043d',
  };

  const paymentLabels: Record<PaymentMethod, string> = {
    cash: locale === 'de' ? 'Barzahlung' : '\u041d\u0430\u043b\u0438\u0447\u043d\u044b\u0435',
    transfer:
      locale === 'de'
        ? 'Ueberweisung'
        : '\u0411\u0430\u043d\u043a\u043e\u0432\u0441\u043a\u0438\u0439 \u043f\u0435\u0440\u0435\u0432\u043e\u0434',
    ec_card: 'EC-Karte',
    paypal: 'PayPal',
  };

  const paymentProviderLabels: Record<PaymentProvider, string> = {
    sumup: 'SumUp',
  };

  const paymentMetaText =
    locale === 'de'
      ? {
          paidAt: 'Bezahlt am',
          paymentProvider: 'Zahlungsanbieter',
        }
      : {
          paidAt: '\u041e\u043f\u043b\u0430\u0447\u0435\u043d\u043e',
          paymentProvider: '\u041f\u043b\u0430\u0442\u0435\u0436\u043d\u044b\u0439 \u043f\u0440\u043e\u0432\u0430\u0439\u0434\u0435\u0440',
        };

  const invoiceText =
    locale === 'de'
      ? {
          editLocked:
            'Die Bearbeitung dieses Auftrags ist deaktiviert: Die Rechnung wurde bereits erstellt und die Originaldaten sind fixiert.',
          invoiceLocked:
            'Dieser Auftrag befindet sich im Archivmodus der Rechnung. Ursprungsdaten, Unterschrift und Fotos koennen nicht mehr normal bearbeitet werden.',
          correctionOfInvoice: 'Dies ist eine Korrektur zur Rechnung',
          invoiceNumber: 'Rechnungsnummer',
          invoiceSent: 'Rechnung versendet',
          pdfInvoice: 'PDF-Rechnung',
        }
      : {
          editLocked: t.orderPage.editLocked,
          invoiceLocked: t.orderPage.invoiceLocked,
          correctionOfInvoice: t.orderPage.correctionOfInvoice,
          invoiceNumber: t.orderPage.invoiceNumber,
          invoiceSent: t.orderPage.invoiceSent,
          pdfInvoice: t.orderPage.pdfInvoice,
        };

  const sectionText =
    locale === 'de'
      ? {
          loadMedia: 'Fotos und Unterschrift laden',
          loadHistory: 'Historie laden',
          loadAudit: 'DB-Audit laden',
          mediaHint: 'Medien werden bei Bedarf geladen, damit die Seite auf dem Telefon schneller startet.',
          historyHint: 'Historie wird nur bei Bedarf geladen.',
          auditHint: 'DB-Audit wird nur bei Bedarf geladen.',
        }
      : {
          loadMedia: '\u0417\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044c \u0444\u043e\u0442\u043e \u0438 \u043f\u043e\u0434\u043f\u0438\u0441\u044c',
          loadHistory: '\u0417\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044c \u0438\u0441\u0442\u043e\u0440\u0438\u044e',
          loadAudit: '\u0417\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044c DB-audit',
          mediaHint:
            '\u041c\u0435\u0434\u0438\u0430 \u043f\u043e\u0434\u0433\u0440\u0443\u0436\u0430\u044e\u0442\u0441\u044f \u043f\u043e \u0437\u0430\u043f\u0440\u043e\u0441\u0443, \u0447\u0442\u043e\u0431\u044b \u0441\u0442\u0440\u0430\u043d\u0438\u0446\u0430 \u0431\u044b\u0441\u0442\u0440\u0435\u0435 \u043e\u0442\u043a\u0440\u044b\u0432\u0430\u043b\u0430\u0441\u044c \u043d\u0430 \u0442\u0435\u043b\u0435\u0444\u043e\u043d\u0435.',
          historyHint: '\u0418\u0441\u0442\u043e\u0440\u0438\u044f \u0437\u0430\u0433\u0440\u0443\u0436\u0430\u0435\u0442\u0441\u044f \u0442\u043e\u043b\u044c\u043a\u043e \u043f\u043e \u0437\u0430\u043f\u0440\u043e\u0441\u0443.',
          auditHint: '\u0410\u0443\u0434\u0438\u0442 \u0411\u0414 \u0437\u0430\u0433\u0440\u0443\u0436\u0430\u0435\u0442\u0441\u044f \u0442\u043e\u043b\u044c\u043a\u043e \u043f\u043e \u0437\u0430\u043f\u0440\u043e\u0441\u0443.',
        };

  const formatDateTimeLocal = (value: string | null | undefined) =>
    value
      ? new Date(value).toLocaleString(locale === 'de' ? 'de-DE' : 'ru-RU', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : DASH;

  const createSectionHref = (section: 'media' | 'history' | 'audit') => {
    const params = new URLSearchParams();

    if (edit) params.set('edit', edit);
    if (showMedia || section === 'media') params.set('media', '1');
    if (showHistory || section === 'history') params.set('history', '1');
    if (showAudit || section === 'audit') params.set('audit', '1');

    return `/orders/${o.id}?${params.toString()}`;
  };

  const deletedAtLabel = o.deleted_at
    ? new Date(o.deleted_at).toLocaleString(locale === 'de' ? 'de-DE' : 'ru-RU')
    : null;

  return (
    <div className="max-w-2xl">
      <div className="mb-4">
        <Link href="/orders" className="text-sm text-neutral-500 hover:text-neutral-700">
          {'<-'} {t.orderPage.backToList}
        </Link>
      </div>

      {isEditing ? (
        <>
          <h1 className="mb-4 text-2xl font-semibold">{t.orderPage.editTitle}</h1>
          <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
            <OrderForm
              action={boundUpdate}
              clients={(clientsListRes.data ?? []) as Client[]}
              services={(servicesListRes.data ?? []) as Service[]}
              initial={o}
              cancelHref={`/orders/${o.id}`}
              submitLabel={t.orderPage.save}
            />
          </div>
        </>
      ) : (
        <>
          {requestedEdit && isInvoiceLocked && (
            <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              {invoiceText.editLocked}
            </div>
          )}

          {isInvoiceLocked && (
            <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
              {invoiceText.invoiceLocked}
            </div>
          )}

          {o.correction_of_order_id && (
            <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              {invoiceText.correctionOfInvoice}{' '}
              {correctionSource?.invoice_number ? (
                <Link href={`/orders/${correctionSource.id}`} className="font-medium underline">
                  {correctionSource.invoice_number}
                </Link>
              ) : (
                t.orderPage.sourceDocument
              )}
              .
              {o.correction_reason && (
                <div className="mt-2 text-xs">
                  {t.orderPage.correctionReason}: {o.correction_reason}
                </div>
              )}
            </div>
          )}

          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="mb-2 flex items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[o.status]}`}>
                  {statusLabels[o.status]}
                </span>
              </div>
              <h1 className="truncate text-2xl font-semibold">{serviceTitle}</h1>
              {o.deleted_at && (
                <div className="mt-2 inline-block rounded bg-red-100 px-2 py-1 text-xs font-medium text-red-800">
                  {t.orderPage.inTrash}
                </div>
              )}
            </div>
            {!isInvoiceLocked && (
              <Link
                href={`/orders/${o.id}?edit=1`}
                className="whitespace-nowrap rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
              >
                {t.orderPage.edit}
              </Link>
            )}
          </div>

          <div className="mb-4 rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
            <div className="mb-2 text-sm text-neutral-500">{t.orderPage.changeStatus}</div>
            <OrderStatusSwitcher orderId={o.id} currentStatus={o.status} />
          </div>

          <div className="mb-4 space-y-3 rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
            <Row
              label={t.orderPage.client}
              value={
                client ? (
                  <Link href={`/clients/${client.id}`} className="text-blue-600 hover:underline">
                    {client.full_name}
                  </Link>
                ) : (
                  DASH
                )
              }
            />
            {client?.phone && (
              <Row
                label={t.orderPage.clientPhone}
                value={
                  <a href={`tel:${client.phone}`} className="text-blue-600 hover:underline">
                    {client.phone}
                  </a>
                }
              />
            )}
            <Row label={t.orderPage.price} value={<span className="font-semibold">{formatPrice(priceToShow)}</span>} />
            {o.payment_method && <Row label={t.orderPage.paymentMethod} value={paymentLabels[o.payment_method]} />}
            {o.payment_provider && (
              <Row label={paymentMetaText.paymentProvider} value={paymentProviderLabels[o.payment_provider]} />
            )}
            {o.paid_at && <Row label={paymentMetaText.paidAt} value={formatDateTimeLocal(o.paid_at)} />}
            <Row label={t.orderPage.workAddress} value={o.order_address ?? client?.address ?? DASH} />
            <Row label={t.orderPage.scheduledAt} value={formatDateTimeLocal(o.scheduled_at)} />
            <Row
              label={t.orderPage.serviceDate}
              value={
                o.service_date ? (
                  formatDateTimeLocal(o.service_date)
                ) : (
                  <span className="italic text-neutral-400">{t.orderPage.notSpecified}</span>
                )
              }
            />
            {o.completed_at && <Row label={t.orderPage.completedAt} value={formatDateTimeLocal(o.completed_at)} />}
            {o.invoice_number && (
              <Row
                label={invoiceText.invoiceNumber}
                value={<span className="font-mono font-semibold">{o.invoice_number}</span>}
              />
            )}
            {o.invoice_sent_at && (
              <Row
                label={invoiceText.invoiceSent}
                value={
                  <span className="text-xs">
                    {formatDateTimeLocal(o.invoice_sent_at)}
                    {o.invoice_sent_to && (
                      <>
                        <br />
                        {t.orderPage.sentTo} {o.invoice_sent_to}
                      </>
                    )}
                  </span>
                }
              />
            )}
            <Row label={t.orderPage.createdAt} value={formatDateTimeLocal(o.created_at)} />
            {o.description && (
              <div className="border-t border-neutral-100 pt-2 dark:border-neutral-800">
                <div className="mb-1 text-sm text-neutral-500">{t.orderPage.description}</div>
                <p className="whitespace-pre-wrap text-sm">{o.description}</p>
              </div>
            )}
          </div>

          {showMedia ? (
            <>
              <div className="mb-4 rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
                <h2 className="mb-3 text-sm font-medium text-neutral-500">{t.orderPage.beforePhotos}</h2>
                <div className="mb-3">
                  <PhotoGallery photos={beforePhotos} />
                </div>
                {!isInvoiceLocked && (
                  <PhotoUploader orderId={o.id} photoType="before" label={t.orderPage.addBeforePhoto} />
                )}
              </div>

              <div className="mb-4 rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
                <h2 className="mb-3 text-sm font-medium text-neutral-500">{t.orderPage.afterPhotos}</h2>
                <div className="mb-3">
                  <PhotoGallery photos={afterPhotos} />
                </div>
                {!isInvoiceLocked && (
                  <PhotoUploader orderId={o.id} photoType="after" label={t.orderPage.addAfterPhoto} />
                )}
              </div>

              <div className="mb-4 rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
                <h2 className="mb-3 text-sm font-medium text-neutral-500">{t.orderPage.signature}</h2>
                {signatureUrl ? (
                  <div>
                    <div className="mb-3 overflow-hidden rounded-lg border border-neutral-200 bg-white dark:border-neutral-800">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={signatureUrl} alt={t.orderPage.signatureAlt} className="w-full" />
                    </div>
                    {!isInvoiceLocked && (
                      <Link href={`/orders/${o.id}/signature`} className="text-sm text-blue-600 hover:underline">
                        {t.orderPage.resign}
                      </Link>
                    )}
                  </div>
                ) : (
                  !isInvoiceLocked && (
                    <Link
                      href={`/orders/${o.id}/signature`}
                      className="inline-flex w-full items-center justify-center rounded-lg border border-dashed border-neutral-300 px-4 py-3 text-sm font-medium text-neutral-700 transition hover:border-blue-500 hover:text-blue-600 dark:border-neutral-700 dark:text-neutral-300"
                    >
                      {t.orderPage.requestSignature}
                    </Link>
                  )
                )}
              </div>
            </>
          ) : (
            <LoadSectionCard
              href={createSectionHref('media')}
              title={sectionText.loadMedia}
              hint={sectionText.mediaHint}
            />
          )}

          <div className="mb-4 rounded-xl border border-neutral-200 bg-white p-5">
            <h2 className="mb-3 text-sm font-medium text-neutral-500">{invoiceText.pdfInvoice}</h2>
            <PdfSection
              orderId={o.id}
              hasPdf={!!o.pdf_file_path}
              invoiceNumber={o.invoice_number}
              clientEmail={client?.email ?? null}
              clientName={client?.full_name ?? (locale === 'de' ? 'Kunde' : '\u041a\u043b\u0438\u0435\u043d\u0442')}
              masterName={masterProfile?.full_name ?? masterProfile?.company_name ?? t.orderPage.masterFallback}
              invoiceSentAt={o.invoice_sent_at}
              invoiceSentTo={o.invoice_sent_to}
            />
            {isInvoiceLocked && !o.correction_of_order_id && (
              <div className="mt-3">
                <CreateCorrectionButton orderId={o.id} />
              </div>
            )}
          </div>

          {(o.pdf_file_path || o.pdf_sha256) && (
            <FileIntegrityPanel
              title={locale === 'de' ? 'PDF-Integritaet' : '\u0426\u0435\u043b\u043e\u0441\u0442\u043d\u043e\u0441\u0442\u044c PDF'}
              hash={o.pdf_sha256}
              path={o.pdf_file_path}
              locale={locale}
            />
          )}

          {corrections.length > 0 && (
            <div className="mb-4 rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
              <h2 className="mb-3 text-sm font-medium text-neutral-500">{t.orderPage.corrections}</h2>
              <ul className="space-y-2">
                {corrections.map((correction) => (
                  <li key={correction.id} className="text-sm">
                    <Link href={`/orders/${correction.id}`} className="text-blue-600 hover:underline">
                      {correction.invoice_number ?? t.orderPage.correctionDraft}
                    </Link>{' '}
                    <span className="text-neutral-500">
                      {t.orderPage.from} {formatDateTimeLocal(correction.created_at)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {showHistory ? (
            logs.length > 0 ? (
              <div className="mb-4 rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
                <h2 className="mb-3 text-sm font-medium text-neutral-500">{t.orderPage.history}</h2>
                <ul className="space-y-2">
                  {logs.map((l) => (
                    <li key={l.id} className="flex items-start gap-3 text-sm">
                      <span className="mt-0.5 whitespace-nowrap text-xs text-neutral-400">
                        {formatDateTimeLocal(l.created_at)}
                      </span>
                      <span>{l.action_text ?? l.action_type}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null
          ) : (
            <LoadSectionCard
              href={createSectionHref('history')}
              title={sectionText.loadHistory}
              hint={sectionText.historyHint}
            />
          )}

          {showAudit ? (
            <AuditTrailList
              entries={auditEntries}
              locale={locale}
              title={locale === 'de' ? 'DB-Audit Trail' : 'DB-audit'}
            />
          ) : (
            <LoadSectionCard
              href={createSectionHref('audit')}
              title={sectionText.loadAudit}
              hint={sectionText.auditHint}
            />
          )}

          {o.deleted_at ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-5">
              <div className="mb-3 flex items-start gap-2">
                <div>
                  <div className="font-medium text-red-900">{t.orderPage.orderInTrash}</div>
                  {deletedAtLabel && (
                    <div className="mt-0.5 text-xs text-red-700">
                      {t.orderPage.deletedAt} {deletedAtLabel}
                    </div>
                  )}
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
      <dd className="text-right text-sm">{value}</dd>
    </div>
  );
}

function LoadSectionCard({
  href,
  title,
  hint,
}: {
  href: string;
  title: string;
  hint: string;
}) {
  return (
    <div className="mb-4 rounded-xl border border-dashed border-neutral-300 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-900">
      <p className="mb-3 text-sm text-neutral-500">{hint}</p>
      <Link
        href={href}
        className="inline-flex items-center justify-center rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-800 transition hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
      >
        {title}
      </Link>
    </div>
  );
}
