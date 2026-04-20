'use server';

import {
  createInvoiceSnapshot,
  isInvoiceSnapshot,
  snapshotToInvoiceData,
  type InvoiceSnapshot,
} from '@/lib/invoices/snapshot';
import { generateInvoicePdf } from '@/lib/pdf/invoice';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

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
  signature_file_path: string | null;
  invoice_number: string | null;
  invoice_issued_at: string | null;
  invoice_locked_at: string | null;
  invoice_version: number | null;
  invoice_snapshot_json: unknown | null;
  pdf_file_path: string | null;
  correction_of_order_id: string | null;
  correction_reason: string | null;
};

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
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', userId).single();

  const missing: string[] = [];
  if (!profile?.full_name && !profile?.company_name) missing.push('имя или компания');
  if (!profile?.address) missing.push('адрес');
  if (!profile?.postal_code) missing.push('PLZ');
  if (!profile?.city) missing.push('город');
  if (!profile?.tax_number) missing.push('Steuernummer');
  if (missing.length > 0) {
    return { snapshot: null, error: `Заполните в настройках: ${missing.join(', ')}` };
  }

  const { data: client } = await supabase
    .from('clients')
    .select('*')
    .eq('id', order.client_id)
    .maybeSingle();
  if (!client) {
    return { snapshot: null, error: 'Клиент не найден' };
  }

  const clientMissing: string[] = [];
  if (!client.full_name?.trim()) clientMissing.push('имя клиента');
  if (!client.address?.trim()) clientMissing.push('улица и дом клиента');
  if (!client.postal_code?.trim()) clientMissing.push('PLZ клиента');
  if (!client.city?.trim()) clientMissing.push('город клиента');
  if (clientMissing.length > 0) {
    return {
      snapshot: null,
      error: `Для выпуска счета заполните у клиента: ${clientMissing.join(', ')}`,
    };
  }

  let serviceTitle = order.custom_service_title ?? 'Leistung';
  let servicePrice = order.custom_price;
  if (order.service_id) {
    const { data: service } = await supabase
      .from('services')
      .select('*')
      .eq('id', order.service_id)
      .maybeSingle();
    if (service) {
      serviceTitle = service.title;
      if (servicePrice === null) servicePrice = service.default_price;
    }
  }

  if (servicePrice === null) {
    return { snapshot: null, error: 'Не указана цена заказа' };
  }

  const serviceDate = order.service_date ?? order.completed_at ?? order.created_at;
  let description = order.description;

  if (order.correction_of_order_id) {
    const { data: sourceOrder } = await supabase
      .from('orders')
      .select('invoice_number')
      .eq('id', order.correction_of_order_id)
      .eq('user_id', userId)
      .maybeSingle();

    if (!sourceOrder?.invoice_number) {
      return { snapshot: null, error: 'Не удалось найти исходный счет для корректировки' };
    }

    if (!serviceTitle.startsWith('Korrektur: ')) {
      serviceTitle = `Korrektur: ${serviceTitle}`;
    }

    const correctionIntro = [
      `Korrektur zu Rechnung ${sourceOrder.invoice_number}`,
      order.correction_reason ? `Grund: ${order.correction_reason}` : null,
    ]
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
        bank_name: profile.bank_name,
      },
      client: {
        full_name: client.full_name,
        phone: client.phone,
        address: [client.address, [client.postal_code, client.city].filter(Boolean).join(' ')]
          .filter(Boolean)
          .join(', '),
      },
      order: {
        id: order.id,
        invoice_number: invoiceNumber,
        invoice_date: invoiceIssuedAt,
        service_date: serviceDate,
        service_title: serviceTitle,
        price: servicePrice,
        description,
        order_address: order.order_address,
        payment_method: order.payment_method,
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
  const storedSnapshot = isInvoiceSnapshot(order.invoice_snapshot_json)
    ? order.invoice_snapshot_json
    : null;
  if (storedSnapshot) {
    return { snapshot: storedSnapshot };
  }

  return buildLiveInvoiceSnapshot(supabase, userId, order, invoiceNumber, invoiceIssuedAt);
}

export async function generatePdfAction(orderId: string): Promise<{
  ok: boolean;
  error?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Не авторизован' };

  const { data: orderData } = await supabase
    .from('orders')
    .select(
      'id, user_id, client_id, service_id, custom_service_title, custom_price, description, order_address, service_date, completed_at, created_at, payment_method, signature_file_path, invoice_number, invoice_issued_at, invoice_locked_at, invoice_version, invoice_snapshot_json, pdf_file_path, correction_of_order_id, correction_reason'
    )
    .eq('id', orderId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!orderData) return { ok: false, error: 'Заказ не найден' };
  const order = orderData as InvoiceOrderRow;

  const storedSnapshot = isInvoiceSnapshot(order.invoice_snapshot_json)
    ? order.invoice_snapshot_json
    : null;

  if (storedSnapshot && order.pdf_file_path) {
    return {
      ok: false,
      error:
        'Счет уже выпущен и зафиксирован. Перегенерация поверх исходного документа запрещена. Для исправления нужен отдельный документ-коррекция.',
    };
  }

  let invoiceNumber = order.invoice_number;
  let invoiceIssuedAt = order.invoice_issued_at;

  if (!invoiceNumber) {
    const year = new Date().getFullYear();
    const { data: numberData, error: numberError } = await supabase.rpc('next_invoice_number', {
      p_user_id: user.id,
      p_year: year,
    });

    if (numberError || numberData === null) {
      return { ok: false, error: `Не удалось получить номер: ${numberError?.message ?? 'error'}` };
    }

    invoiceNumber = `${year}-${String(numberData).padStart(4, '0')}`;
    invoiceIssuedAt = new Date().toISOString();
  }

  if (!invoiceIssuedAt) {
    invoiceIssuedAt = new Date().toISOString();
  }

  const snapshotResult = await getOrBuildSnapshot(
    supabase,
    user.id,
    order,
    invoiceNumber,
    invoiceIssuedAt
  );
  if (!snapshotResult.snapshot) {
    return { ok: false, error: snapshotResult.error ?? 'Не удалось сформировать snapshot счета' };
  }
  const snapshot = snapshotResult.snapshot;

  const assets = await loadPdfAssets(supabase, orderId, order.signature_file_path);
  const invoiceData = snapshotToInvoiceData(snapshot, {
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
      error: `Ошибка генерации: ${e instanceof Error ? e.message : 'неизвестно'}`,
    };
  }

  const version = Math.max(snapshot.version ?? 1, order.invoice_version ?? 0, 1);
  const filePath = `${user.id}/${orderId}/invoice-v${version}.pdf`;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });

  const { error: uploadError } = await supabase.storage.from('order-pdfs').upload(filePath, blob, {
    contentType: 'application/pdf',
    cacheControl: '3600',
    upsert: true,
  });
  if (uploadError) return { ok: false, error: uploadError.message };

  const { error: updateError } = await supabase
    .from('orders')
    .update({
      invoice_number: snapshot.invoice_number,
      invoice_issued_at: snapshot.invoice_issued_at,
      invoice_locked_at: order.invoice_locked_at ?? new Date().toISOString(),
      invoice_version: version,
      invoice_snapshot_json: snapshot,
      pdf_file_path: filePath,
    })
    .eq('id', orderId)
    .eq('user_id', user.id);

  if (updateError) return { ok: false, error: updateError.message };

  await supabase.from('activity_logs').insert({
    order_id: orderId,
    user_id: user.id,
    action_type: order.correction_of_order_id ? 'invoice_correction_issued' : 'invoice_issued',
    action_text: order.correction_of_order_id
      ? `Корректировка ${snapshot.invoice_number} выпущена и зафиксирована`
      : `Счет ${snapshot.invoice_number} выпущен и зафиксирован`,
  });

  revalidatePath(`/orders/${orderId}`);
  revalidatePath('/invoices');
  return { ok: true };
}

export async function getPdfSignedUrlAction(orderId: string): Promise<{
  url: string | null;
  error?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { url: null, error: 'Не авторизован' };

  const { data: order } = await supabase
    .from('orders')
    .select('pdf_file_path, invoice_number, correction_of_order_id')
    .eq('id', orderId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!order?.pdf_file_path) return { url: null, error: 'PDF не создан' };

  const prefix = order.correction_of_order_id ? 'Rechnungskorrektur' : 'Rechnung';
  const filename = order.invoice_number
    ? `${prefix}-${order.invoice_number}.pdf`
    : `${prefix}-${orderId.slice(0, 8)}.pdf`;

  const { data, error } = await supabase.storage
    .from('order-pdfs')
    .createSignedUrl(order.pdf_file_path, 300, {
      download: filename,
    });

  if (error || !data) return { url: null, error: error?.message ?? 'Ошибка' };
  return { url: data.signedUrl };
}
