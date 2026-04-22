import { parsePriceInput } from '@/lib/utils/format';

export type OrderInput = {
  client_id: string;
  client_quick_name: string;
  client_quick_phone: string;
  client_quick_address: string;
  client_quick_postal_code: string;
  client_quick_city: string;
  correction_reason: string;
  service_id: string;
  custom_service_title: string;
  custom_price: string;
  description: string;
  order_address: string;
  scheduled_at: string;
  service_date: string;
  payment_method: string;
  payment_provider: string;
  paid_at: string;
};

export type OrderValidationErrors = Partial<Record<keyof OrderInput, string>>;

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

  const hasService = data.service_id.trim().length > 0;
  const hasCustom = data.custom_service_title.trim().length > 0;

  if (!hasService && !hasCustom) {
    errors.service_id = 'Bitte Service auswaehlen oder eigenen Titel eingeben';
  }

  if (data.custom_price.trim() !== '') {
    const price = parsePriceInput(data.custom_price);
    if (price === null) errors.custom_price = 'Ungueltiger Preis';
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

  if (data.payment_provider && data.payment_method !== 'ec_card') {
    errors.payment_provider = 'Zahlungsanbieter ist nur fuer Kartenzahlung erlaubt';
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

  const hasService = data.service_id.trim().length > 0;

  return {
    client_id: data.client_id.trim() || null,
    client_quick_name: clean(data.client_quick_name),
    client_quick_phone: clean(data.client_quick_phone),
    client_quick_address: clean(data.client_quick_address),
    client_quick_postal_code: clean(data.client_quick_postal_code),
    client_quick_city: clean(data.client_quick_city),
    correction_reason: clean(data.correction_reason),
    service_id: hasService ? data.service_id : null,
    custom_service_title: hasService ? null : clean(data.custom_service_title),
    custom_price: parsePriceInput(data.custom_price),
    description: clean(data.description),
    order_address: clean(data.order_address),
    scheduled_at: data.scheduled_at ? new Date(data.scheduled_at).toISOString() : null,
    service_date: data.service_date ? new Date(data.service_date).toISOString() : null,
    payment_method: data.payment_method.trim() || null,
    payment_provider: data.payment_provider.trim() || null,
    paid_at: data.paid_at ? new Date(data.paid_at).toISOString() : null,
  };
}
