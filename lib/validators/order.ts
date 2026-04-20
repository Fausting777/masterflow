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
};

export type OrderValidationErrors = Partial<Record<keyof OrderInput, string>>;

export function validateOrder(data: OrderInput): OrderValidationErrors {
  const errors: OrderValidationErrors = {};

  const hasClientId = data.client_id.trim().length > 0;
  const hasQuickName = data.client_quick_name.trim().length > 0;

  if (!hasClientId && !hasQuickName) {
    errors.client_id = 'Выберите клиента или введите имя';
  }
  if (hasQuickName && data.client_quick_name.trim().length > 200) {
    errors.client_quick_name = 'Имя слишком длинное';
  }

  const hasService = data.service_id.trim().length > 0;
  const hasCustom = data.custom_service_title.trim().length > 0;

  if (!hasService && !hasCustom) {
    errors.service_id = 'Выберите услугу или введите ее название';
  }

  if (data.custom_price.trim() !== '') {
    const price = parsePriceInput(data.custom_price);
    if (price === null) errors.custom_price = 'Некорректная цена';
  }

  if (data.correction_reason.length > 1000) {
    errors.correction_reason = 'Причина корректировки слишком длинная';
  }

  if (data.description.length > 5000) {
    errors.description = 'Описание слишком длинное';
  }

  if (data.order_address.length > 500) {
    errors.order_address = 'Адрес слишком длинный';
  }

  if (data.scheduled_at && Number.isNaN(Date.parse(data.scheduled_at))) {
    errors.scheduled_at = 'Некорректная дата';
  }

  if (data.service_date && Number.isNaN(Date.parse(data.service_date))) {
    errors.service_date = 'Некорректная дата';
  }

  if (data.payment_method && !['cash', 'transfer', 'ec_card', 'paypal'].includes(data.payment_method)) {
    errors.payment_method = 'Некорректный способ оплаты';
  }

  if (data.client_quick_phone.length > 50) {
    errors.client_quick_phone = 'Телефон слишком длинный';
  }

  if (hasQuickName && data.client_quick_address.length > 500) {
    errors.client_quick_address = 'Адрес клиента слишком длинный';
  }

  if (
    hasQuickName &&
    data.client_quick_postal_code.trim().length > 0 &&
    !/^\d{5}$/.test(data.client_quick_postal_code.trim())
  ) {
    errors.client_quick_postal_code = 'PLZ должен быть 5 цифр';
  }

  if (hasQuickName && data.client_quick_city.length > 200) {
    errors.client_quick_city = 'Название города слишком длинное';
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
  };
}
