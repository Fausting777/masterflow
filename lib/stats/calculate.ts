// lib/stats/calculate.ts
import type { SupabaseClient } from '@supabase/supabase-js';

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
  const { data, error } = await supabase
    .from('orders')
    .select('custom_price, service_id')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .not('invoice_number', 'is', null)
    .gte('invoice_issued_at', from.toISOString())
    .lte('invoice_issued_at', to.toISOString());

  if (error || !data || data.length === 0) {
    return { total: 0, invoicesCount: 0, avgCheck: 0 };
  }

  // Для точности: если custom_price null и есть service_id — подтягиваем цену из services.
  // Но для скорости сначала соберём service_id, где price null.
  const needServiceIds: string[] = [];
  for (const o of data) {
    if ((o.custom_price === null || o.custom_price === undefined) && o.service_id) {
      needServiceIds.push(o.service_id);
    }
  }

  const servicePrices = new Map<string, number>();
  if (needServiceIds.length > 0) {
    const uniq = [...new Set(needServiceIds)];
    const { data: services } = await supabase
      .from('services')
      .select('id, default_price')
      .in('id', uniq);
    for (const s of services ?? []) {
      if (s.default_price !== null) servicePrices.set(s.id, Number(s.default_price));
    }
  }

  let total = 0;
  let counted = 0;
  for (const o of data) {
    let price = o.custom_price !== null ? Number(o.custom_price) : null;
    if (price === null && o.service_id) {
      price = servicePrices.get(o.service_id) ?? null;
    }
    if (price !== null) {
      total += price;
      counted++;
    }
  }

  return {
    total: Math.round(total * 100) / 100,
    invoicesCount: data.length,
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
  const { data } = await supabase
    .from('orders')
    .select('status')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .gte('created_at', from.toISOString())
    .lte('created_at', to.toISOString());

  const result = { new: 0, in_progress: 0, completed: 0, canceled: 0 };
  for (const o of data ?? []) {
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
  // Тянем за один запрос всё: счета с invoice_issued_at в диапазоне первый-последний месяц
  const first = months[0].from;
  const last = months[months.length - 1].to;

  const { data } = await supabase
    .from('orders')
    .select('custom_price, service_id, invoice_issued_at')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .not('invoice_number', 'is', null)
    .gte('invoice_issued_at', first.toISOString())
    .lte('invoice_issued_at', last.toISOString());

  if (!data || data.length === 0) return months.map(() => 0);

  // Подтягиваем цены услуг для тех, у кого custom_price null
  const needIds = [...new Set(
    data.filter(o => o.custom_price === null && o.service_id).map(o => o.service_id!)
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

  const result = months.map(() => 0);
  for (const o of data) {
    if (!o.invoice_issued_at) continue;
    const d = new Date(o.invoice_issued_at).getTime();

    let price = o.custom_price !== null ? Number(o.custom_price) : null;
    if (price === null && o.service_id) price = priceMap.get(o.service_id) ?? null;
    if (price === null) continue;

    // Найдём нужный месяц
    for (let i = 0; i < months.length; i++) {
      if (d >= months[i].from.getTime() && d <= months[i].to.getTime()) {
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
  const { data } = await supabase
    .from('orders')
    .select('client_id, custom_price, service_id')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .not('invoice_number', 'is', null)
    .gte('invoice_issued_at', from.toISOString())
    .lte('invoice_issued_at', to.toISOString());

  if (!data || data.length === 0) return [];

  const needIds = [...new Set(
    data.filter(o => o.custom_price === null && o.service_id).map(o => o.service_id!)
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

  // Группируем
  const byClient = new Map<string, { total: number; count: number }>();
  for (const o of data) {
    let price = o.custom_price !== null ? Number(o.custom_price) : null;
    if (price === null && o.service_id) price = priceMap.get(o.service_id) ?? null;
    if (price === null) continue;

    const prev = byClient.get(o.client_id) ?? { total: 0, count: 0 };
    byClient.set(o.client_id, {
      total: prev.total + price,
      count: prev.count + 1,
    });
  }

  // Получаем имена
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
      name: nameMap.get(id) ?? 'Неизвестно',
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
  const { data } = await supabase
    .from('orders')
    .select('service_id, custom_service_title')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .gte('created_at', from.toISOString())
    .lte('created_at', to.toISOString());

  if (!data || data.length === 0) return [];

  // Получаем названия услуг из service_id
  const serviceIds = [...new Set(
    data.filter(o => o.service_id).map(o => o.service_id!)
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
  for (const o of data) {
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