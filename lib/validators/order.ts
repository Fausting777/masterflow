import { parsePriceInput } from '@/lib/utils/format';

export type OrderItemInput = {
  service_id: string; // uuid или 'custom'
  title: string;
  price: string;
  save_to_catalog: boolean;
};

export type OrderInput = {
  client_id: string;
  client_quick_name: string;
  client_quick_phone: string;
  client_quick_address: string;
  client_quick_postal_code: string;
  client_quick_city: string;
  correction_reason: string;
  items: OrderItemInput[];
  description: string;
  order_address: string;
  scheduled_at: string;
  service_date: string;
  payment_method: string;
  payment_provider: string;
  paid_at: string;
};

export type OrderValidationErrors = Partial<Record<keyof OrderInput, string>> & {
  items?: string;
};

export function validateOrder(data: OrderInput): OrderValidationErrors {
  const errors: OrderValidationErrors = {};

  const hasClientId = data.client_id.trim().length > 0;
  const hasQuickName = data.client_quick_name.trim().length > 0;

  if (!hasClientId && !hasQuickName) {
    errors.client_id = 'Bitte Kunden auswaehlen oder neuen Namen eingeben';
  }
  if (hasQuickName && data.client_quick_name.trim().length > 200) {
    errors.client_quick_name = 'Kundenname ist zu lang';
  }

  if (data.items.length === 0) {
    errors.items = 'Mindestens eine Leistung ist erforderlich';
  } else {
    for (const item of data.items) {
      if (!item.title.trim()) {
        errors.items = 'Titel der Leistung darf nicht leer sein';
        break;
      }
      const price = parsePriceInput(item.price);
      if (price === null) {
        errors.items = 'Ungueltiger Preis fuer eine Leistung';
        break;
      }
    }
  }

  if (data.correction_reason.length > 1000) {
    errors.correction_reason = 'Korrekturgrund ist zu lang';
  }

  if (data.description.length > 5000) {
    errors.description = 'Beschreibung ist zu lang';
  }

  if (data.order_address.length > 500) {
    errors.order_address = 'Auftragsadresse ist zu lang';
  }

  if (data.scheduled_at && Number.isNaN(Date.parse(data.scheduled_at))) {
    errors.scheduled_at = 'Ungueltiges Datum';
  }

  if (data.service_date && Number.isNaN(Date.parse(data.service_date))) {
    errors.service_date = 'Ungueltiges Datum';
  }

  if (data.payment_method && !['cash', 'transfer', 'ec_card', 'paypal'].includes(data.payment_method)) {
    errors.payment_method = 'Ungueltige Zahlungsart';
  }

  if (data.payment_provider && !['sumup'].includes(data.payment_provider)) {
    errors.payment_provider = 'Ungueltiger Zahlungsanbieter';
  }

  if (data.payment_provider && !['cash', 'ec_card'].includes(data.payment_method)) {
    errors.payment_provider = 'Zahlungsanbieter ist только для Bar- или Kartenzahlung';
  }

  if (data.paid_at && Number.isNaN(Date.parse(data.paid_at))) {
    errors.paid_at = 'Ungueltiges Zahlungsdatum';
  }

  if (data.client_quick_phone.length > 50) {
    errors.client_quick_phone = 'Telefonnummer ist zu lang';
  }

  if (hasQuickName && data.client_quick_address.length > 500) {
    errors.client_quick_address = 'Kundenadresse ist zu lang';
  }

  if (
    hasQuickName &&
    data.client_quick_postal_code.trim().length > 0 &&
    !/^\d{5}$/.test(data.client_quick_postal_code.trim())
  ) {
    errors.client_quick_postal_code = 'PLZ muss aus 5 Ziffern bestehen';
  }

  if (hasQuickName && data.client_quick_city.length > 200) {
    errors.client_quick_city = 'Stadtname ist zu lang';
  }

  return errors;
}

export function normalizeOrderInput(data: OrderInput) {
  const clean = (value: string) => {
    const trimmed = value.trim();
    return trimmed.length === 0 ? null : trimmed;
  };
  const toIsoDate = (value: string) => {
    if (!value) return null;
    const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
    return new Date(dateOnly ? `${value}T12:00:00` : value).toISOString();
  };

  const normalizedItems = data.items.map(item => ({
    service_id: item.service_id === 'custom' ? null : item.service_id,
    title: item.title.trim(),
    price: parsePriceInput(item.price) || 0,
    save_to_catalog: item.save_to_catalog
  }));

  return {
    client_id: data.client_id.trim() || null,
    client_quick_name: clean(data.client_quick_name),
    client_quick_phone: clean(data.client_quick_phone),
    client_quick_address: clean(data.client_quick_address),
    client_quick_postal_code: clean(data.client_quick_postal_code),
    client_quick_city: clean(data.client_quick_city),
    correction_reason: clean(data.correction_reason),
    items: normalizedItems,
    description: clean(data.description),
    order_address: clean(data.order_address),
    scheduled_at: toIsoDate(data.scheduled_at),
    service_date: toIsoDate(data.service_date),
    payment_method: data.payment_method.trim() || null,
    payment_provider: data.payment_provider.trim() || null,
    paid_at: toIsoDate(data.paid_at),
  };
}
