// lib/stats/calculate.ts
import type { SupabaseClient } from '@supabase/supabase-js';

// ==================================================================
// ВЫБОР ДАТЫ ДЛЯ АГРЕГАЦИИ
// Приоритет: service_date → completed_at → created_at
// ==================================================================
// Это "эффективная дата услуги" — то, по чему считаем статистику.

// Postgres COALESCE через raw-SQL не получится в supabase-js фильтре,
// поэтому мы тянем нужные поля и фильтруем на клиенте (Node).

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

// ======================================================
// ИТОГОВАЯ СУММА ВЫСТАВЛЕННЫХ СЧЕТОВ ЗА ПЕРИОД
// считаем по service_date (fallback completed_at → created_at)
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
  // Важно: мы НЕ фильтруем по service_date в SQL (не факт что оно есть у всех),
  // а тянем всё за широкий диапазон и фильтруем на стороне Node.
  // Чтобы не вытягивать мильон — берём за год в обе стороны от диапазона.
  const wideFrom = new Date(from.getTime() - 365 * 24 * 60 * 60 * 1000);
  const wideTo = new Date(to.getTime() + 365 * 24 * 60 * 60 * 1000);

  const { data, error } = await supabase
    .from('orders')
    .select('custom_price, service_id, service_date, completed_at, created_at')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .not('invoice_number', 'is', null)
    .gte('created_at', wideFrom.toISOString())
    .lte('created_at', wideTo.toISOString());

  if (error || !data || data.length === 0) {
    return { total: 0, invoicesCount: 0, avgCheck: 0 };
  }

  // Фильтруем по эффективной дате
  const inPeriod = data.filter(o => inRange(effectiveDate(o), from, to));
  if (inPeriod.length === 0) {
    return { total: 0, invoicesCount: 0, avgCheck: 0 };
  }

  // Подтягиваем service prices где custom_price null
  const needServiceIds: string[] = [];
  for (const o of inPeriod) {
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
  for (const o of inPeriod) {
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
    invoicesCount: inPeriod.length,
    avgCheck: counted > 0 ? Math.round((total / counted) * 100) / 100 : 0,
  };
}

// ======================================================
// РАСПРЕДЕЛЕНИЕ ЗАКАЗОВ ПО СТАТУСАМ ЗА ПЕРИОД
// Теперь тоже по service_date (fallback → completed_at → created_at)
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
// По service_date (fallback...)
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
    .select('custom_price, service_id, service_date, completed_at, created_at')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .not('invoice_number', 'is', null)
    .gte('created_at', wideFrom.toISOString())
    .lte('created_at', wideTo.toISOString());

  if (!data || data.length === 0) return months.map(() => 0);

  // Цены услуг
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
    const eff = effectiveDate(o);
    const effT = eff.getTime();

    let price = o.custom_price !== null ? Number(o.custom_price) : null;
    if (price === null && o.service_id) price = priceMap.get(o.service_id) ?? null;
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
// ТОП-КЛИЕНТЫ ПО СУММЕ СЧЕТОВ — по service_date
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
    .select('client_id, custom_price, service_id, service_date, completed_at, created_at')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .not('invoice_number', 'is', null)
    .gte('created_at', wideFrom.toISOString())
    .lte('created_at', wideTo.toISOString());

  if (!data || data.length === 0) return [];

  const inPeriod = data.filter(o => inRange(effectiveDate(o), from, to));
  if (inPeriod.length === 0) return [];

  const needIds = [...new Set(
    inPeriod.filter(o => o.custom_price === null && o.service_id).map(o => o.service_id!)
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

  const byClient = new Map<string, { total: number; count: number }>();
  for (const o of inPeriod) {
    let price = o.custom_price !== null ? Number(o.custom_price) : null;
    if (price === null && o.service_id) price = priceMap.get(o.service_id) ?? null;
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
      name: nameMap.get(id) ?? 'Неизвестно',
      total: Math.round(v.total * 100) / 100,
      count: v.count,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);
}

// ======================================================
// ТОП-УСЛУГИ ПО ЧАСТОТЕ — по service_date
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
// ЗАКАЗЫ БЕЗ СЧЁТА ЗА ПЕРИОД — по service_date (fallback)
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

  // Клиенты
  const clientIds = [...new Set(inPeriod.map(o => o.client_id))];
  const { data: clients } = await supabase
    .from('clients')
    .select('id, full_name')
    .in('id', clientIds);
  const clientNames = new Map((clients ?? []).map(c => [c.id, c.full_name]));

  // Услуги
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

  return inPeriod.map(o => {
    const service = o.service_id ? serviceMap.get(o.service_id) : null;
    return {
      id: o.id,
      client_name: clientNames.get(o.client_id) ?? '—',
      service_title: service?.title ?? o.custom_service_title ?? '—',
      price: o.custom_price !== null ? Number(o.custom_price) : service?.price ?? null,
      created_at: o.created_at,
      effective_date: effectiveDate(o).toISOString(),
      status: o.status,
    };
  });
}