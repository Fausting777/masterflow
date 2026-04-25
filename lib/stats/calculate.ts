// lib/stats/calculate.ts
import type { SupabaseClient } from '@supabase/supabase-js';
import { isInvoiceSnapshot } from '@/lib/invoices/snapshot';

// ==================================================================
// ВЫБОР ДАТЫ ДЛЯ АГРЕГАЦИИ
// Приоритет: service_date → completed_at → created_at
// ==================================================================

function effectiveDate(o: {
  service_date: string | null;
  completed_at?: string | null;
  created_at: string;
}): Date {
  return new Date(o.service_date ?? o.completed_at ?? o.created_at);
}

function inRange(d: Date, from: Date, to: Date): boolean {
  const t = d.getTime();
  return t >= from.getTime() && t <= to.getTime();
}

// Единый приоритет цены заказа:
// 1. snapshot.order.items[] (сумма позиций)
// 2. snapshot.order.price
// 3. order_items сумма (передаётся извне)
// 4. custom_price
// 5. service default_price
function resolvePrice(
  o: {
    id: string;
    custom_price: number | null;
    service_id: string | null;
    invoice_snapshot_json: unknown;
  },
  servicePrices: Map<string, number>,
  orderItemsTotals: Map<string, number>
): number | null {
  const snap = isInvoiceSnapshot(o.invoice_snapshot_json) ? o.invoice_snapshot_json : null;

  if (snap?.order.items && snap.order.items.length > 0) {
    return snap.order.items.reduce((sum, item) => sum + Number(item.price), 0);
  }
  if (snap?.order.price != null) {
    return Number(snap.order.price);
  }

  const itemsTotal = orderItemsTotals.get(o.id);
  if (itemsTotal !== undefined && itemsTotal > 0) {
    return itemsTotal;
  }

  if (o.custom_price !== null) {
    return Number(o.custom_price);
  }

  if (o.service_id) {
    return servicePrices.get(o.service_id) ?? null;
  }

  return null;
}

// Загружает order_items суммы для заказов без snapshot-цены
async function fetchOrderItemsTotals(
  supabase: SupabaseClient,
  orders: Array<{ id: string; custom_price: number | null; invoice_snapshot_json: unknown }>
): Promise<Map<string, number>> {
  const needIds = orders
    .filter(o => {
      const snap = isInvoiceSnapshot(o.invoice_snapshot_json) ? o.invoice_snapshot_json : null;
      if (snap?.order.items && snap.order.items.length > 0) return false;
      if (snap?.order.price != null) return false;
      if (o.custom_price !== null) return false;
      return true;
    })
    .map(o => o.id);

  const totals = new Map<string, number>();
  if (needIds.length === 0) return totals;

  const { data: items } = await supabase
    .from('order_items')
    .select('order_id, price')
    .in('order_id', needIds);

  for (const item of items ?? []) {
    const prev = totals.get(item.order_id) ?? 0;
    totals.set(item.order_id, prev + Number(item.price));
  }

  return totals;
}

// ======================================================
// ИТОГОВАЯ СУММА ВЫСТАВЛЕННЫХ СЧЕТОВ ЗА ПЕРИОД
// ======================================================
export async function getRevenueStats(
  supabase: SupabaseClient,
  userId: string,
  from: Date,
  to: Date
): Promise<{
  total: number;
  invoicesCount: number;
  avgCheck: number;
}> {
  const wideFrom = new Date(from.getTime() - 365 * 24 * 60 * 60 * 1000);
  const wideTo = new Date(to.getTime() + 365 * 24 * 60 * 60 * 1000);

  const { data, error } = await supabase
    .from('orders')
    .select('id, custom_price, service_id, service_date, completed_at, created_at, invoice_snapshot_json')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .not('invoice_number', 'is', null)
    .gte('created_at', wideFrom.toISOString())
    .lte('created_at', wideTo.toISOString());

  if (error || !data || data.length === 0) {
    return { total: 0, invoicesCount: 0, avgCheck: 0 };
  }

  const inPeriod = data.filter(o => inRange(effectiveDate(o), from, to));
  if (inPeriod.length === 0) {
    return { total: 0, invoicesCount: 0, avgCheck: 0 };
  }

  // Цены услуг
  const needServiceIds = [...new Set(
    inPeriod
      .filter(o => {
        const snap = isInvoiceSnapshot(o.invoice_snapshot_json) ? o.invoice_snapshot_json : null;
        return !snap?.order.price && !(snap?.order.items?.length) && o.custom_price === null && o.service_id;
      })
      .map(o => o.service_id!)
  )];

  const servicePrices = new Map<string, number>();
  if (needServiceIds.length > 0) {
    const { data: services } = await supabase
      .from('services')
      .select('id, default_price')
      .in('id', needServiceIds);
    for (const s of services ?? []) {
      if (s.default_price !== null) servicePrices.set(s.id, Number(s.default_price));
    }
  }

  const orderItemsTotals = await fetchOrderItemsTotals(supabase, inPeriod);

  let total = 0;
  let counted = 0;
  for (const o of inPeriod) {
    const price = resolvePrice(o, servicePrices, orderItemsTotals);
    if (price !== null) {
      total += price;
      counted++;
    }
  }

  return {
    total: Math.round(total * 100) / 100,
    invoicesCount: inPeriod.length,
    avgCheck: counted > 0 ? Math.round((total / counted) * 100) / 100 : 0,
  };
}

// ======================================================
// РАСПРЕДЕЛЕНИЕ ЗАКАЗОВ ПО СТАТУСАМ ЗА ПЕРИОД
// ======================================================
export async function getStatusBreakdown(
  supabase: SupabaseClient,
  userId: string,
  from: Date,
  to: Date
): Promise<Record<'new' | 'in_progress' | 'completed' | 'canceled', number>> {
  const wideFrom = new Date(from.getTime() - 365 * 24 * 60 * 60 * 1000);
  const wideTo = new Date(to.getTime() + 365 * 24 * 60 * 60 * 1000);

  const { data } = await supabase
    .from('orders')
    .select('status, service_date, completed_at, created_at')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .gte('created_at', wideFrom.toISOString())
    .lte('created_at', wideTo.toISOString());

  const result = { new: 0, in_progress: 0, completed: 0, canceled: 0 };
  for (const o of data ?? []) {
    if (!inRange(effectiveDate(o), from, to)) continue;
    const s = o.status as keyof typeof result;
    if (s in result) result[s]++;
  }
  return result;
}

// ======================================================
// ВЫРУЧКА ПО МЕСЯЦАМ ДЛЯ ГРАФИКА
// ======================================================
export async function getMonthlyRevenue(
  supabase: SupabaseClient,
  userId: string,
  months: Array<{ from: Date; to: Date }>
): Promise<number[]> {
  const first = months[0].from;
  const last = months[months.length - 1].to;
  const wideFrom = new Date(first.getTime() - 365 * 24 * 60 * 60 * 1000);
  const wideTo = new Date(last.getTime() + 365 * 24 * 60 * 60 * 1000);

  const { data } = await supabase
    .from('orders')
    .select('id, custom_price, service_id, service_date, completed_at, created_at, invoice_snapshot_json')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .not('invoice_number', 'is', null)
    .gte('created_at', wideFrom.toISOString())
    .lte('created_at', wideTo.toISOString());

  if (!data || data.length === 0) return months.map(() => 0);

  const needIds = [...new Set(
    data
      .filter(o => {
        const snap = isInvoiceSnapshot(o.invoice_snapshot_json) ? o.invoice_snapshot_json : null;
        return !snap?.order.price && !(snap?.order.items?.length) && o.custom_price === null && o.service_id;
      })
      .map(o => o.service_id!)
  )];

  const priceMap = new Map<string, number>();
  if (needIds.length > 0) {
    const { data: services } = await supabase
      .from('services')
      .select('id, default_price')
      .in('id', needIds);
    for (const s of services ?? []) {
      if (s.default_price !== null) priceMap.set(s.id, Number(s.default_price));
    }
  }

  const orderItemsTotals = await fetchOrderItemsTotals(supabase, data);

  const result = months.map(() => 0);
  for (const o of data) {
    const eff = effectiveDate(o);
    const effT = eff.getTime();
    const price = resolvePrice(o, priceMap, orderItemsTotals);
    if (price === null) continue;

    for (let i = 0; i < months.length; i++) {
      if (effT >= months[i].from.getTime() && effT <= months[i].to.getTime()) {
        result[i] += price;
        break;
      }
    }
  }

  return result.map(v => Math.round(v * 100) / 100);
}

// ======================================================
// ТОП-КЛИЕНТЫ ПО СУММЕ СЧЕТОВ
// ======================================================
export async function getTopClients(
  supabase: SupabaseClient,
  userId: string,
  from: Date,
  to: Date,
  limit = 5
): Promise<Array<{ clientId: string; name: string; total: number; count: number }>> {
  const wideFrom = new Date(from.getTime() - 365 * 24 * 60 * 60 * 1000);
  const wideTo = new Date(to.getTime() + 365 * 24 * 60 * 60 * 1000);

  const { data } = await supabase
    .from('orders')
    .select('id, client_id, custom_price, service_id, service_date, completed_at, created_at, invoice_snapshot_json')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .not('invoice_number', 'is', null)
    .gte('created_at', wideFrom.toISOString())
    .lte('created_at', wideTo.toISOString());

  if (!data || data.length === 0) return [];

  const inPeriod = data.filter(o => inRange(effectiveDate(o), from, to));
  if (inPeriod.length === 0) return [];

  const needIds = [...new Set(
    inPeriod
      .filter(o => {
        const snap = isInvoiceSnapshot(o.invoice_snapshot_json) ? o.invoice_snapshot_json : null;
        return !snap?.order.price && !(snap?.order.items?.length) && o.custom_price === null && o.service_id;
      })
      .map(o => o.service_id!)
  )];

  const priceMap = new Map<string, number>();
  if (needIds.length > 0) {
    const { data: services } = await supabase
      .from('services')
      .select('id, default_price')
      .in('id', needIds);
    for (const s of services ?? []) {
      if (s.default_price !== null) priceMap.set(s.id, Number(s.default_price));
    }
  }

  const orderItemsTotals = await fetchOrderItemsTotals(supabase, inPeriod);

  const byClient = new Map<string, { total: number; count: number }>();
  for (const o of inPeriod) {
    const price = resolvePrice(o, priceMap, orderItemsTotals);
    if (price === null) continue;

    const prev = byClient.get(o.client_id) ?? { total: 0, count: 0 };
    byClient.set(o.client_id, {
      total: prev.total + price,
      count: prev.count + 1,
    });
  }

  const ids = [...byClient.keys()];
  if (ids.length === 0) return [];
  const { data: clients } = await supabase
    .from('clients')
    .select('id, full_name')
    .in('id', ids);

  const nameMap = new Map((clients ?? []).map(c => [c.id, c.full_name]));

  return [...byClient.entries()]
    .map(([id, v]) => ({
      clientId: id,
      name: nameMap.get(id) ?? '—',
      total: Math.round(v.total * 100) / 100,
      count: v.count,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);
}

// ======================================================
// ТОП-УСЛУГИ ПО ЧАСТОТЕ
// ======================================================
export async function getTopServices(
  supabase: SupabaseClient,
  userId: string,
  from: Date,
  to: Date,
  limit = 5
): Promise<Array<{ title: string; count: number }>> {
  const wideFrom = new Date(from.getTime() - 365 * 24 * 60 * 60 * 1000);
  const wideTo = new Date(to.getTime() + 365 * 24 * 60 * 60 * 1000);

  const { data } = await supabase
    .from('orders')
    .select('service_id, custom_service_title, service_date, completed_at, created_at')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .gte('created_at', wideFrom.toISOString())
    .lte('created_at', wideTo.toISOString());

  if (!data || data.length === 0) return [];

  const inPeriod = data.filter(o => inRange(effectiveDate(o), from, to));
  if (inPeriod.length === 0) return [];

  const serviceIds = [...new Set(
    inPeriod.filter(o => o.service_id).map(o => o.service_id!)
  )];
  const serviceNames = new Map<string, string>();
  if (serviceIds.length > 0) {
    const { data: services } = await supabase
      .from('services')
      .select('id, title')
      .in('id', serviceIds);
    for (const s of services ?? []) {
      serviceNames.set(s.id, s.title);
    }
  }

  const counts = new Map<string, number>();
  for (const o of inPeriod) {
    const title = o.service_id
      ? serviceNames.get(o.service_id) ?? 'Услуга'
      : o.custom_service_title ?? 'Без названия';
    counts.set(title, (counts.get(title) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([title, count]) => ({ title, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

// ======================================================
// ЗАКАЗЫ БЕЗ СЧЁТА ЗА ПЕРИОД
// ======================================================
export async function getOrdersWithoutInvoice(
  supabase: SupabaseClient,
  userId: string,
  from: Date,
  to: Date
): Promise<Array<{
  id: string;
  client_name: string;
  service_title: string;
  price: number | null;
  created_at: string;
  effective_date: string;
  status: string;
}>> {
  const wideFrom = new Date(from.getTime() - 365 * 24 * 60 * 60 * 1000);
  const wideTo = new Date(to.getTime() + 365 * 24 * 60 * 60 * 1000);

  const { data } = await supabase
    .from('orders')
    .select('id, client_id, service_id, custom_service_title, custom_price, created_at, completed_at, service_date, status')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .is('invoice_number', null)
    .gte('created_at', wideFrom.toISOString())
    .lte('created_at', wideTo.toISOString())
    .order('created_at', { ascending: false });

  if (!data || data.length === 0) return [];

  const inPeriod = data.filter(o => inRange(effectiveDate(o), from, to));
  if (inPeriod.length === 0) return [];

  const clientIds = [...new Set(inPeriod.map(o => o.client_id))];
  const { data: clients } = await supabase
    .from('clients')
    .select('id, full_name')
    .in('id', clientIds);
  const clientNames = new Map((clients ?? []).map(c => [c.id, c.full_name]));

  const serviceIds = [...new Set(inPeriod.filter(o => o.service_id).map(o => o.service_id!))];
  const serviceMap = new Map<string, { title: string; price: number | null }>();
  if (serviceIds.length > 0) {
    const { data: services } = await supabase
      .from('services')
      .select('id, title, default_price')
      .in('id', serviceIds);
    for (const s of services ?? []) {
      serviceMap.set(s.id, {
        title: s.title,
        price: s.default_price !== null ? Number(s.default_price) : null,
      });
    }
  }

  // Fetch order_items for orders without custom_price
  const needItemIds = inPeriod
    .filter(o => o.custom_price === null)
    .map(o => o.id);
  const orderItemsTotals = new Map<string, number>();
  if (needItemIds.length > 0) {
    const { data: items } = await supabase
      .from('order_items')
      .select('order_id, price')
      .in('order_id', needItemIds);
    for (const item of items ?? []) {
      const prev = orderItemsTotals.get(item.order_id) ?? 0;
      orderItemsTotals.set(item.order_id, prev + Number(item.price));
    }
  }

  return inPeriod.map(o => {
    const service = o.service_id ? serviceMap.get(o.service_id) : null;
    let price: number | null = null;
    if (o.custom_price !== null) {
      price = Number(o.custom_price);
    } else {
      const itemsTotal = orderItemsTotals.get(o.id);
      if (itemsTotal !== undefined && itemsTotal > 0) {
        price = itemsTotal;
      } else {
        price = service?.price ?? null;
      }
    }
    return {
      id: o.id,
      client_name: clientNames.get(o.client_id) ?? '—',
      service_title: service?.title ?? o.custom_service_title ?? '—',
      price,
      created_at: o.created_at,
      effective_date: effectiveDate(o).toISOString(),
      status: o.status,
    };
  });
}
