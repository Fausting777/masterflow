'use server';

import { revalidatePath } from 'next/cache';
import {
  createInvoiceSnapshot,
  isInvoiceSnapshot,
  snapshotToInvoiceData,
  type InvoiceSnapshot,
} from '@/lib/invoices/snapshot';
import { getLocale } from '@/lib/i18n/server';
import { generateInvoicePdf } from '@/lib/pdf/invoice';
import { sha256Hex } from '@/lib/security/hash';
import { createClient } from '@/lib/supabase/server';

type InvoiceOrderRow = {
  id: string;
  user_id: string;
  client_id: string;
  service_id: string | null;
  custom_service_title: string | null;
  custom_price: number | null;
  description: string | null;
  order_address: string | null;
  service_date: string | null;
  completed_at: string | null;
  created_at: string;
  payment_method: 'cash' | 'transfer' | 'ec_card' | 'paypal' | null;
  payment_provider: 'sumup' | null;
  paid_at: string | null;
  signature_file_path: string | null;
  invoice_number: string | null;
  invoice_issued_at: string | null;
  invoice_locked_at: string | null;
  invoice_version: number | null;
  invoice_snapshot_json: unknown | null;
  pdf_file_path: string | null;
  pdf_sha256: string | null;
  correction_of_order_id: string | null;
  correction_reason: string | null;
};

type InvoiceSumupTransactionRow = {
  id: string;
  receipt_no: string | null;
  transaction_code: string | null;
  sumup_transaction_id: string | null;
  amount: number | string | null;
  currency: string | null;
  status: string | null;
  payment_type: string | null;
  entry_mode: string | null;
  paid_at: string | null;
};

type InvoiceOrderItemRow = {
  service_id: string | null;
  title: string;
  price: number | string;
};

async function getMessages() {
  const locale = await getLocale();
  return locale === 'de'
    ? {
        missingMasterName: 'Name oder Firmenname',
        missingAddress: 'Adresse',
        missingCity: 'Stadt',
        fillSettings: 'Bitte in den Einstellungen ausfuellen',
        clientNotFound: 'Kunde nicht gefunden',
        missingClientName: 'Kundenname',
        missingClientAddress: 'Strasse und Hausnummer des Kunden',
        missingClientPostal: 'PLZ des Kunden',
        missingClientCity: 'Stadt des Kunden',
        fillClient: 'Fuer die Rechnung bitte beim Kunden ausfuellen',
        missingPrice: 'Preis des Auftrags ist nicht angegeben',
        missingSourceInvoice: 'Ausgangsrechnung fuer die Korrektur konnte nicht gefunden werden',
        unauthorized: 'Nicht autorisiert',
        orderNotFound: 'Auftrag nicht gefunden',
        invoiceLocked:
          'Die Rechnung wurde bereits erstellt und fixiert. Eine Neugenerierung ueber das Ausgangsdokument ist gesperrt. Fuer Aenderungen ist eine separate Rechnungskorrektur erforderlich.',
        invoicePdfRefreshed: 'PDF der Rechnung wurde aus dem fixierten Snapshot neu erzeugt',
        numberFailed: 'Rechnungsnummer konnte nicht erzeugt werden',
        snapshotFailed: 'Rechnungssnapshot konnte nicht erstellt werden',
        generationError: 'Fehler bei der PDF-Erzeugung',
        correctionIssued: 'Rechnungskorrektur',
        invoiceIssued: 'Rechnung',
        wasIssued: 'wurde erstellt und fixiert',
        pdfMissing: 'PDF wurde nicht erstellt',
        genericError: 'Fehler',
      }
    : {
        missingMasterName: '\u0418\u043c\u044f \u0438\u043b\u0438 \u043d\u0430\u0437\u0432\u0430\u043d\u0438\u0435 \u043a\u043e\u043c\u043f\u0430\u043d\u0438\u0438',
        missingAddress: '\u0410\u0434\u0440\u0435\u0441',
        missingCity: '\u0413\u043e\u0440\u043e\u0434',
        fillSettings: '\u0417\u0430\u043f\u043e\u043b\u043d\u0438\u0442\u0435 \u0432 \u043d\u0430\u0441\u0442\u0440\u043e\u0439\u043a\u0430\u0445',
        clientNotFound: '\u041a\u043b\u0438\u0435\u043d\u0442 \u043d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d',
        missingClientName: '\u0418\u043c\u044f \u043a\u043b\u0438\u0435\u043d\u0442\u0430',
        missingClientAddress: '\u0423\u043b\u0438\u0446\u0430 \u0438 \u0434\u043e\u043c \u043a\u043b\u0438\u0435\u043d\u0442\u0430',
        missingClientPostal: 'PLZ \u043a\u043b\u0438\u0435\u043d\u0442\u0430',
        missingClientCity: '\u0413\u043e\u0440\u043e\u0434 \u043a\u043b\u0438\u0435\u043d\u0442\u0430',
        fillClient:
          '\u0414\u043b\u044f \u0432\u044b\u0434\u0430\u0447\u0438 \u043a\u0432\u0438\u0442\u0430\u043d\u0446\u0438\u0438 \u0437\u0430\u043f\u043e\u043b\u043d\u0438\u0442\u0435 \u0434\u0430\u043d\u043d\u044b\u0435 \u043a\u043b\u0438\u0435\u043d\u0442\u0430',
        missingPrice: '\u041d\u0435 \u0443\u043a\u0430\u0437\u0430\u043d\u0430 \u0446\u0435\u043d\u0430 \u0437\u0430\u043a\u0430\u0437\u0430',
        missingSourceInvoice:
          '\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u043d\u0430\u0439\u0442\u0438 \u0438\u0441\u0445\u043e\u0434\u043d\u0443\u044e \u043a\u0432\u0438\u0442\u0430\u043d\u0446\u0438\u044e \u0434\u043b\u044f \u043a\u043e\u0440\u0440\u0435\u043a\u0442\u0438\u0440\u043e\u0432\u043a\u0438',
        unauthorized: '\u041d\u0435\u0442 \u0430\u0432\u0442\u043e\u0440\u0438\u0437\u0430\u0446\u0438\u0438',
        orderNotFound: '\u0417\u0430\u043a\u0430\u0437 \u043d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d',
        invoiceLocked:
          '\u041a\u0432\u0438\u0442\u0430\u043d\u0446\u0438\u044f \u0443\u0436\u0435 \u0432\u044b\u0434\u0430\u043d\u0430 \u0438 \u0437\u0430\u0444\u0438\u043a\u0441\u0438\u0440\u043e\u0432\u0430\u043d\u0430. \u041f\u043e\u0432\u0442\u043e\u0440\u043d\u0430\u044f \u0433\u0435\u043d\u0435\u0440\u0430\u0446\u0438\u044f \u043f\u043e \u0438\u0441\u0445\u043e\u0434\u043d\u043e\u043c\u0443 \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u0443 \u0437\u0430\u043f\u0440\u0435\u0449\u0435\u043d\u0430. \u0414\u043b\u044f \u0438\u0441\u043f\u0440\u0430\u0432\u043b\u0435\u043d\u0438\u0439 \u043d\u0443\u0436\u043d\u0430 \u043e\u0442\u0434\u0435\u043b\u044c\u043d\u0430\u044f \u043a\u043e\u0440\u0440\u0435\u043a\u0442\u0438\u0440\u043e\u0432\u043a\u0430 \u043a\u0432\u0438\u0442\u0430\u043d\u0446\u0438\u0438.',
        invoicePdfRefreshed:
          '\u041f\u0414\u0424 \u043a\u0432\u0438\u0442\u0430\u043d\u0446\u0438\u0438 \u0437\u0430\u043d\u043e\u0432\u043e \u0441\u043e\u0437\u0434\u0430\u043d \u0438\u0437 \u0437\u0430\u0444\u0438\u043a\u0441\u0438\u0440\u043e\u0432\u0430\u043d\u043d\u043e\u0433\u043e snapshot',
        numberFailed:
          '\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u043f\u043e\u043b\u0443\u0447\u0438\u0442\u044c \u043d\u043e\u043c\u0435\u0440 \u043a\u0432\u0438\u0442\u0430\u043d\u0446\u0438\u0438',
        snapshotFailed:
          '\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0441\u0444\u043e\u0440\u043c\u0438\u0440\u043e\u0432\u0430\u0442\u044c snapshot \u043a\u0432\u0438\u0442\u0430\u043d\u0446\u0438\u0438',
        generationError: '\u041e\u0448\u0438\u0431\u043a\u0430 \u0433\u0435\u043d\u0435\u0440\u0430\u0446\u0438\u0438',
        correctionIssued: '\u041a\u043e\u0440\u0440\u0435\u043a\u0442\u0438\u0440\u043e\u0432\u043a\u0430 \u043a\u0432\u0438\u0442\u0430\u043d\u0446\u0438\u0438',
        invoiceIssued: '\u041a\u0432\u0438\u0442\u0430\u043d\u0446\u0438\u044f',
        wasIssued: '\u0432\u044b\u043f\u0438\u0441\u0430\u043d \u0438 \u0437\u0430\u0444\u0438\u043a\u0441\u0438\u0440\u043e\u0432\u0430\u043d',
        pdfMissing: 'PDF \u0435\u0449\u0435 \u043d\u0435 \u0441\u043e\u0437\u0434\u0430\u043d',
        genericError: '\u041e\u0448\u0438\u0431\u043a\u0430',
      };
}

async function downloadFile(
  supabase: Awaited<ReturnType<typeof createClient>>,
  bucket: string,
  path: string
): Promise<Uint8Array | null> {
  const { data, error } = await supabase.storage.from(bucket).download(path);
  if (error || !data) return null;
  return new Uint8Array(await data.arrayBuffer());
}

async function loadPdfAssets(
  supabase: Awaited<ReturnType<typeof createClient>>,
  orderId: string,
  signatureFilePath: string | null
) {
  const { data: photos } = await supabase
    .from('order_photos')
    .select('*')
    .eq('order_id', orderId)
    .order('created_at', { ascending: true });

  const beforePhotos: Uint8Array[] = [];
  const afterPhotos: Uint8Array[] = [];

  for (const photo of photos ?? []) {
    const bytes = await downloadFile(supabase, 'order-photos', photo.file_path);
    if (!bytes) continue;
    if (photo.photo_type === 'before') beforePhotos.push(bytes);
    else afterPhotos.push(bytes);
  }

  let signature: Uint8Array | null = null;
  if (signatureFilePath) {
    signature = await downloadFile(supabase, 'order-signatures', signatureFilePath);
  }

  return { beforePhotos, afterPhotos, signature };
}

async function buildLiveInvoiceSnapshot(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  order: InvoiceOrderRow,
  invoiceNumber: string,
  invoiceIssuedAt: string
): Promise<{ snapshot: InvoiceSnapshot | null; error?: string }> {
  const m = await getMessages();
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', userId).single();

  const missing: string[] = [];
  if (!profile?.full_name && !profile?.company_name) missing.push(m.missingMasterName);
  if (!profile?.address) missing.push(m.missingAddress);
  if (!profile?.postal_code) missing.push('PLZ');
  if (!profile?.city) missing.push(m.missingCity);
  if (!profile?.tax_number && !profile?.vat_id) missing.push('Steuernummer / USt-IdNr.');
  if (missing.length > 0) {
    return { snapshot: null, error: `${m.fillSettings}: ${missing.join(', ')}` };
  }

  const { data: client } = await supabase.from('clients').select('*').eq('id', order.client_id).maybeSingle();
  if (!client) return { snapshot: null, error: m.clientNotFound };

  const clientMissing: string[] = [];
  if (!client.full_name?.trim()) clientMissing.push(m.missingClientName);
  if (!client.address?.trim()) clientMissing.push(m.missingClientAddress);
  if (!client.postal_code?.trim()) clientMissing.push(m.missingClientPostal);
  if (!client.city?.trim()) clientMissing.push(m.missingClientCity);
  if (clientMissing.length > 0) {
    return { snapshot: null, error: `${m.fillClient}: ${clientMissing.join(', ')}` };
  }

  let serviceTitle = order.custom_service_title ?? 'Leistung';
  let servicePrice = order.custom_price;
  let correctionOfInvoiceNumber: string | null = null;

  if (order.service_id) {
    const { data: service } = await supabase.from('services').select('*').eq('id', order.service_id).maybeSingle();
    if (service) {
      serviceTitle = service.title;
      if (servicePrice === null) servicePrice = service.default_price;
    }
  }

  const { data: itemRows } = await supabase
    .from('order_items')
    .select('service_id, title, price')
    .eq('order_id', order.id)
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  const items = ((itemRows ?? []) as InvoiceOrderItemRow[])
    .map((item) => ({
      title: item.title,
      price: Number(item.price),
    }))
    .filter((item) => item.title.trim() && Number.isFinite(item.price));

  if (items.length > 0) {
    serviceTitle = items.length > 1 ? `${items[0].title} + ${items.length - 1}` : items[0].title;
    servicePrice = items.reduce((sum, item) => sum + item.price, 0);
  }

  if (servicePrice === null) {
    return { snapshot: null, error: m.missingPrice };
  }

  const serviceDate = order.service_date ?? order.completed_at ?? order.created_at;
  let description = order.description;
  const { data: sumupTransaction } = await supabase
    .from('sumup_transactions')
    .select(
      'id, receipt_no, transaction_code, sumup_transaction_id, amount, currency, status, payment_type, entry_mode, paid_at'
    )
    .eq('order_id', order.id)
    .eq('user_id', userId)
    .order('paid_at', { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();
  const sumup = sumupTransaction as InvoiceSumupTransactionRow | null;

  if (order.correction_of_order_id) {
    const { data: sourceOrder } = await supabase
      .from('orders')
      .select('invoice_number')
      .eq('id', order.correction_of_order_id)
      .eq('user_id', userId)
      .maybeSingle();

    if (!sourceOrder?.invoice_number) {
      return { snapshot: null, error: m.missingSourceInvoice };
    }

    if (!serviceTitle.startsWith('Korrektur: ')) {
      serviceTitle = `Korrektur: ${serviceTitle}`;
    }

    correctionOfInvoiceNumber = sourceOrder.invoice_number;

    const correctionIntro = [order.correction_reason ? `Grund: ${order.correction_reason}` : null]
      .filter(Boolean)
      .join('\n');

    description = description?.trim() ? `${correctionIntro}\n\n${description}` : correctionIntro;
  }

  return {
    snapshot: createInvoiceSnapshot({
      createdAt: invoiceIssuedAt,
      orderId: order.id,
      invoiceNumber,
      invoiceIssuedAt,
      master: {
        full_name: profile.full_name,
        phone: profile.phone,
        email: profile.business_email ?? profile.email ?? null,
        company_name: profile.company_name,
        address: profile.address,
        postal_code: profile.postal_code,
        city: profile.city,
        tax_number: profile.tax_number,
        vat_id: profile.vat_id,
        is_kleinunternehmer: profile.is_kleinunternehmer ?? true,
        iban: profile.iban,
        bic: profile.bic ?? null,
        bank_name: profile.bank_name,
      },
      client: {
        full_name: client.full_name,
        phone: client.phone,
        email: client.email,
        address: client.address,
        postal_code: client.postal_code,
        city: client.city,
      },
      order: {
        id: order.id,
        invoice_number: invoiceNumber,
        invoice_date: invoiceIssuedAt,
        service_date: serviceDate,
        service_title: serviceTitle,
        price: servicePrice,
        items: items.length > 0 ? items : undefined,
        correction_of_invoice_number: correctionOfInvoiceNumber,
        description,
        order_address: order.order_address,
        payment_method: order.payment_method ?? (sumup ? 'ec_card' : null),
        payment_provider: order.payment_provider ?? (sumup ? 'sumup' : null),
        paid_at: order.paid_at ?? sumup?.paid_at ?? null,
        sumup: sumup
          ? {
              receipt_no: sumup.receipt_no,
              transaction_code: sumup.transaction_code,
              transaction_id: sumup.sumup_transaction_id,
              amount: sumup.amount === null ? null : Number(sumup.amount),
              currency: sumup.currency,
              paid_at: sumup.paid_at,
              status: sumup.status,
              payment_type: sumup.payment_type,
              entry_mode: sumup.entry_mode,
            }
          : null,
      },
    }),
  };
}

async function getOrBuildSnapshot(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  order: InvoiceOrderRow,
  invoiceNumber: string,
  invoiceIssuedAt: string
): Promise<{ snapshot: InvoiceSnapshot | null; error?: string }> {
  const storedSnapshot = isInvoiceSnapshot(order.invoice_snapshot_json) ? order.invoice_snapshot_json : null;
  if (storedSnapshot) return { snapshot: storedSnapshot };
  return buildLiveInvoiceSnapshot(supabase, userId, order, invoiceNumber, invoiceIssuedAt);
}

export async function generatePdfAction(orderId: string): Promise<{
  ok: boolean;
  error?: string;
}> {
  const m = await getMessages();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: m.unauthorized };

  const { data: orderData } = await supabase
    .from('orders')
    .select(
      'id, user_id, client_id, service_id, custom_service_title, custom_price, description, order_address, service_date, completed_at, created_at, payment_method, payment_provider, paid_at, signature_file_path, invoice_number, invoice_issued_at, invoice_locked_at, invoice_version, invoice_snapshot_json, pdf_file_path, pdf_sha256, correction_of_order_id, correction_reason'
    )
    .eq('id', orderId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!orderData) return { ok: false, error: m.orderNotFound };
  const order = orderData as InvoiceOrderRow;

  const storedSnapshot = isInvoiceSnapshot(order.invoice_snapshot_json) ? order.invoice_snapshot_json : null;
  const isRefreshingIssuedPdf = Boolean(storedSnapshot && order.pdf_file_path);

  let invoiceNumber = order.invoice_number;
  let invoiceIssuedAt = order.invoice_issued_at;

  if (!invoiceNumber) {
    const year = new Date().getFullYear();
    const { data: numberData, error: numberError } = await supabase.rpc('next_invoice_number_secure', {
      p_year: year,
    });

    if (numberError || numberData === null) {
      return { ok: false, error: `${m.numberFailed}: ${numberError?.message ?? 'error'}` };
    }

    invoiceNumber = `${year}-${String(numberData).padStart(4, '0')}`;
    invoiceIssuedAt = new Date().toISOString();
  }

  if (!invoiceIssuedAt) invoiceIssuedAt = new Date().toISOString();

  order.paid_at =
    order.paid_at ??
    (order.payment_method && ['cash', 'ec_card', 'paypal'].includes(order.payment_method)
      ? invoiceIssuedAt
      : null);

  order.payment_provider =
    order.payment_provider ??
    (order.payment_method === 'ec_card' ? 'sumup' : null);

  const snapshotResult = await getOrBuildSnapshot(supabase, user.id, order, invoiceNumber, invoiceIssuedAt);
  if (!snapshotResult.snapshot) {
    return { ok: false, error: snapshotResult.error ?? m.snapshotFailed };
  }
  const snapshot = snapshotResult.snapshot;
  const version = Math.max(snapshot.version ?? 1, order.invoice_version ?? 0, 1);
  const snapshotForStorage: InvoiceSnapshot = { ...snapshot, version };

  const assets = await loadPdfAssets(supabase, orderId, order.signature_file_path);
  const invoiceData = snapshotToInvoiceData(snapshotForStorage, {
    signature: assets.signature,
    photosBefore: assets.beforePhotos,
    photosAfter: assets.afterPhotos,
  });

  let pdfBytes: Uint8Array;
  try {
    pdfBytes = await generateInvoicePdf(invoiceData);
  } catch (e) {
    return {
      ok: false,
      error: `${m.generationError}: ${e instanceof Error ? e.message : 'unknown'}`,
    };
  }

  const filePath = isRefreshingIssuedPdf && order.pdf_file_path
    ? order.pdf_file_path
    : `${user.id}/${orderId}/invoice-v${version}.pdf`;
  const pdfSha256 = sha256Hex(pdfBytes);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });

  const { error: uploadError } = await supabase.storage.from('order-pdfs').upload(filePath, blob, {
    contentType: 'application/pdf',
    cacheControl: '3600',
    upsert: true,
  });
  if (uploadError) return { ok: false, error: uploadError.message };

  const updatePayload = isRefreshingIssuedPdf
    ? { pdf_sha256: pdfSha256 }
    : {
        invoice_number: snapshot.invoice_number,
        invoice_issued_at: snapshot.invoice_issued_at,
        invoice_locked_at: order.invoice_locked_at ?? new Date().toISOString(),
        invoice_version: version,
        invoice_snapshot_json: snapshotForStorage,
        pdf_file_path: filePath,
        pdf_sha256: pdfSha256,
        paid_at: order.paid_at,
        payment_provider: order.payment_provider,
      };

  const { error: updateError } = await supabase
    .from('orders')
    .update(updatePayload)
    .eq('id', orderId)
    .eq('user_id', user.id);

  if (updateError) return { ok: false, error: updateError.message };

  await supabase.from('activity_logs').insert({
    order_id: orderId,
    user_id: user.id,
    action_type: order.correction_of_order_id ? 'invoice_correction_issued' : 'invoice_issued',
    action_text: isRefreshingIssuedPdf
      ? `${m.invoicePdfRefreshed}: ${snapshot.invoice_number}`
      : order.correction_of_order_id
        ? `${m.correctionIssued} ${snapshot.invoice_number} ${m.wasIssued}`
        : `${m.invoiceIssued} ${snapshot.invoice_number} ${m.wasIssued}`,
  });

  revalidatePath(`/orders/${orderId}`);
  revalidatePath('/invoices');
  return { ok: true };
}

export async function getPdfSignedUrlAction(orderId: string): Promise<{
  url: string | null;
  error?: string;
}> {
  const m = await getMessages();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { url: null, error: m.unauthorized };

  const { data: order } = await supabase
    .from('orders')
    .select('pdf_file_path, invoice_number, correction_of_order_id')
    .eq('id', orderId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!order?.pdf_file_path) return { url: null, error: m.pdfMissing };

  const { data, error } = await supabase.storage
    .from('order-pdfs')
    .createSignedUrl(order.pdf_file_path, 300);

  if (error || !data) return { url: null, error: error?.message ?? m.genericError };
  return { url: data.signedUrl };
}
