import { createClient } from '@/lib/supabase/server';

function formatFilenameTimestamp(date: Date) {
  const pad = (value: number) => String(value).padStart(2, '0');
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    '-',
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
  ].join('');
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: orderId } = await params;
  const shouldDownload = new URL(request.url).searchParams.get('download') === '1';
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { data: order } = await supabase
    .from('orders')
    .select('pdf_file_path, invoice_number, correction_of_order_id')
    .eq('id', orderId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!order?.pdf_file_path) {
    return new Response('PDF not found', { status: 404 });
  }

  const { data, error } = await supabase.storage.from('order-pdfs').download(order.pdf_file_path);
  if (error || !data) {
    return new Response(error?.message ?? 'PDF download failed', { status: 500 });
  }

  const prefix = order.correction_of_order_id ? 'Rechnungskorrektur' : 'Rechnung';
  const timestamp = formatFilenameTimestamp(new Date());
  const filename = order.invoice_number
    ? `${prefix}-${order.invoice_number}-${timestamp}.pdf`
    : `${prefix}-${orderId.slice(0, 8)}-${timestamp}.pdf`;

  return new Response(data, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `${shouldDownload ? 'attachment' : 'inline'}; filename="${filename}"`,
      'Cache-Control': 'private, no-store, max-age=0',
    },
  });
}
