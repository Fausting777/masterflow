'use client';

import { useActionState, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Trash2 } from 'lucide-react';
import Spinner from '@/components/ui/Spinner';
import PostalCodeLookup from '@/components/clients/PostalCodeLookup';
import { useI18n } from '@/components/i18n/LocaleProvider';
import CsrfTokenInput from '@/components/security/CsrfTokenInput';
import type { OrderFormState } from '@/app/(dashboard)/orders/actions';
import type { Client, Service } from '@/types/database';

type OrderItemFormValue = {
  service_id: string;
  title: string;
  description: string;
  price: string;
  save_to_catalog: boolean;
};

type Props = {
  action: (prev: OrderFormState, fd: FormData) => Promise<OrderFormState>;
  clients: Client[];
  services: Service[];
  initial?: {
    client_id?: string;
    description?: string | null;
    order_address?: string | null;
    service_date?: string | null;
    payment_method?: string | null;
    payment_provider?: string | null;
    paid_at?: string | null;
    items?: {
      service_id: string | null;
      title: string;
      description?: string | null;
      price: number;
    }[];
  };
  cancelHref: string;
  submitLabel: string;
};

function toDateLocal(iso: string | null | undefined): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function createEmptyItem(): OrderItemFormValue {
  return { service_id: 'custom', title: '', description: '', price: '', save_to_catalog: true };
}

function scoreServiceMatch(service: Service, query: string) {
  const terms = query
    .toLowerCase()
    .split(/\s+/)
    .map((term) => term.trim())
    .filter((term) => term.length >= 3);
  if (terms.length === 0) return 0;

  const haystack = `${service.title} ${service.description ?? ''}`.toLowerCase();
  return terms.reduce((score, term) => score + (haystack.includes(term) ? 1 : 0), 0);
}

export default function OrderForm({
  action,
  clients,
  services,
  initial,
  cancelHref,
  submitLabel,
}: Props) {
  const [state, formAction, isPending] = useActionState<OrderFormState, FormData>(action, {});
  const { t, locale } = useI18n();

  const [items, setItems] = useState<OrderItemFormValue[]>(() => {
    if (initial?.items && initial.items.length > 0) {
      return initial.items.map((item) => ({
        service_id: item.service_id ?? 'custom',
        title: item.title,
        description: item.description ?? '',
        price: String(item.price),
        save_to_catalog: item.service_id === null,
      }));
    }

    return [createEmptyItem()];
  });

  const isEditing = Boolean(initial?.client_id);
  const [useQuickClient, setUseQuickClient] = useState(!isEditing && clients.length === 0);
  const [selectedClientId, setSelectedClientId] = useState(initial?.client_id ?? '');
  const [quickAddress, setQuickAddress] = useState('');
  const [quickPostalCode, setQuickPostalCode] = useState('');
  const [quickCity, setQuickCity] = useState('');
  const [orderAddress, setOrderAddress] = useState(initial?.order_address ?? '');
  const [orderAddressTouched, setOrderAddressTouched] = useState(Boolean(initial?.order_address));
  const [paymentMethod, setPaymentMethod] = useState(initial?.payment_method ?? '');
  const [paymentProvider, setPaymentProvider] = useState(initial?.payment_provider ?? '');
  const [paidAt, setPaidAt] = useState(toDateLocal(initial?.paid_at));
  const [activeServiceIndex, setActiveServiceIndex] = useState<number | null>(null);

  const inputCls =
    'w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-neutral-700 dark:bg-neutral-900';

  const updateItem = (index: number, patch: Partial<OrderItemFormValue>) => {
    setItems((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)));
  };

  const updateItemTitle = (index: number, title: string) => {
    const matchedService = services.find((service) => service.title.toLowerCase() === title.trim().toLowerCase());

    if (matchedService) {
      updateItem(index, {
        service_id: matchedService.id,
        title: matchedService.title,
        description: matchedService.description ?? '',
        price: matchedService.default_price !== null ? String(matchedService.default_price) : '',
        save_to_catalog: false,
      });
      return;
    }

    const suggestedService = services
      .map((service) => ({ service, score: scoreServiceMatch(service, title) }))
      .sort((a, b) => b.score - a.score)[0];

    updateItem(index, {
      service_id: 'custom',
      title,
      description: items[index]?.description || (suggestedService?.score ? suggestedService.service.description ?? '' : ''),
      save_to_catalog: true,
    });
  };

  const selectService = (index: number, service: Service) => {
    updateItem(index, {
      service_id: service.id,
      title: service.title,
      description: service.description ?? '',
      price: service.default_price !== null ? String(service.default_price) : '',
      save_to_catalog: false,
    });
    setActiveServiceIndex(null);
  };

  const getServiceSuggestions = (query: string) => {
    const cleanQuery = query.trim().toLowerCase();
    if (!cleanQuery) return services.slice(0, 8);

    return services
      .map((service) => ({
        service,
        score:
          (service.title.toLowerCase().includes(cleanQuery) ? 10 : 0) +
          scoreServiceMatch(service, cleanQuery),
      }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score || a.service.title.localeCompare(b.service.title))
      .slice(0, 8)
      .map((entry) => entry.service);
  };

  const addItem = () => {
    setItems((current) => [...current, createEmptyItem()]);
  };

  const removeItem = (index: number) => {
    setItems((current) => (current.length <= 1 ? current : current.filter((_, itemIndex) => itemIndex !== index)));
  };

  useEffect(() => {
    if (!useQuickClient || orderAddressTouched) return;
    const cityLine = [quickPostalCode.trim(), quickCity.trim()].filter(Boolean).join(' ');
    const nextOrderAddress = [quickAddress.trim(), cityLine].filter(Boolean).join(', ');
    setOrderAddress(nextOrderAddress);
  }, [quickAddress, quickPostalCode, quickCity, orderAddressTouched, useQuickClient]);

  useEffect(() => {
    if (useQuickClient || orderAddressTouched || !selectedClientId) return;
    const selectedClient = clients.find((client) => client.id === selectedClientId);
    if (!selectedClient) return;
    const cityLine = [selectedClient.postal_code?.trim(), selectedClient.city?.trim()].filter(Boolean).join(' ');
    const nextOrderAddress = [selectedClient.address?.trim(), cityLine].filter(Boolean).join(', ');
    setOrderAddress(nextOrderAddress);
  }, [clients, orderAddressTouched, selectedClientId, useQuickClient]);

  const handlePaymentMethodChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const nextMethod = e.target.value;
      setPaymentMethod(nextMethod);
      if (!['cash', 'ec_card'].includes(nextMethod)) {
        setPaymentProvider('');
      } else if (nextMethod === 'ec_card' && !paymentProvider) {
        setPaymentProvider('sumup');
      }
      if (!paidAt && ['cash', 'ec_card', 'paypal'].includes(nextMethod)) {
        setPaidAt(toDateLocal(new Date().toISOString()));
      }
    },
    [paymentProvider, paidAt]
  );

  return (
    <form action={formAction} className="space-y-6">
      <CsrfTokenInput />

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-semibold">{t.orderForm.client} *</label>
          {!isEditing && (
            <button type="button" onClick={() => setUseQuickClient(!useQuickClient)} className="text-xs text-blue-600">
              {useQuickClient ? t.orderForm.fromDatabase : t.orderForm.quickName}
            </button>
          )}
        </div>

        {useQuickClient ? (
          <div className="space-y-2">
            <input name="client_quick_name" placeholder={t.orderForm.quickNamePlaceholder} className={inputCls} required />
            <input name="client_quick_phone" type="tel" placeholder={t.orderForm.quickPhonePlaceholder} className={inputCls} />
            <input value={quickAddress} onChange={(e) => setQuickAddress(e.target.value)} name="client_quick_address" placeholder={t.orderForm.quickAddressPlaceholder} className={inputCls} />
            <div className="grid grid-cols-3 gap-2">
              <input value={quickPostalCode} onChange={(e) => setQuickPostalCode(e.target.value.replace(/\D/g, ''))} name="client_quick_postal_code" maxLength={5} placeholder="PLZ" className={inputCls} />
              <input value={quickCity} onChange={(e) => setQuickCity(e.target.value)} name="client_quick_city" placeholder={t.orderForm.quickCityPlaceholder} className="col-span-2 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900" />
            </div>
            <PostalCodeLookup postalCode={quickPostalCode} onCityDetected={(city) => setQuickCity((previous) => previous || city)} />
          </div>
        ) : (
          <select name="client_id" value={selectedClientId} onChange={(e) => setSelectedClientId(e.target.value)} className={inputCls}>
            <option value="">{t.orderForm.selectClient}</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.full_name} {client.phone && `(${client.phone})`}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="space-y-3">
        <label className="text-sm font-semibold">{locale === 'de' ? 'Leistungen' : '\u0423\u0441\u043b\u0443\u0433\u0438'} *</label>

        <div className="space-y-4">
          {items.map((item, index) => (
            <div key={index} className="relative space-y-2 rounded-xl border border-neutral-200 p-3 shadow-sm dark:border-neutral-800">
              {items.length > 1 && (
                <button type="button" onClick={() => removeItem(index)} className="absolute -right-2 -top-2 rounded-full bg-red-100 p-1 text-red-600 hover:bg-red-200 dark:bg-red-900/30">
                  <Trash2 size={16} />
                </button>
              )}

              <input type="hidden" name={`items[${index}].service_id`} value={item.service_id} />
              <input type="hidden" name={`items[${index}].save_to_catalog`} value={item.save_to_catalog ? 'true' : 'false'} />

              <input
                name={`items[${index}].title`}
                value={item.title}
                onChange={(e) => updateItemTitle(index, e.target.value)}
                onFocus={() => setActiveServiceIndex(index)}
                placeholder={t.orderForm.customServicePlaceholder}
                className={inputCls}
                autoComplete="off"
                required
              />

              {activeServiceIndex === index && services.length > 0 && (
                <div className="rounded-xl border border-neutral-200 bg-white shadow-lg dark:border-neutral-700 dark:bg-neutral-900">
                  <div className="max-h-72 overflow-y-auto py-1">
                    {getServiceSuggestions(item.title).length > 0 ? (
                      getServiceSuggestions(item.title).map((service) => (
                        <button
                          key={service.id}
                          type="button"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => selectService(index, service)}
                          className="block w-full px-3 py-3 text-left text-sm hover:bg-blue-50 active:bg-blue-100 dark:hover:bg-neutral-800"
                        >
                          <span className="block font-medium text-neutral-900 dark:text-neutral-100">{service.title}</span>
                          <span className="mt-0.5 block text-xs text-neutral-500">
                            {service.default_price !== null ? `${service.default_price} EUR` : locale === 'de' ? 'Preis offen' : '\u0426\u0435\u043d\u0430 \u043d\u0435 \u0443\u043a\u0430\u0437\u0430\u043d\u0430'}
                            {service.description ? ` · ${service.description}` : ''}
                          </span>
                        </button>
                      ))
                    ) : (
                      <div className="px-3 py-3 text-sm text-neutral-500">
                        {locale === 'de' ? 'Keine passende Leistung. Eigene Leistung wird gespeichert.' : '\u041d\u0435\u0442 \u043f\u043e\u0434\u0445\u043e\u0434\u044f\u0449\u0435\u0439 \u0443\u0441\u043b\u0443\u0433\u0438. \u0411\u0443\u0434\u0435\u0442 \u0441\u043e\u0445\u0440\u0430\u043d\u0435\u043d\u0430 \u0441\u0432\u043e\u044f.'}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <input
                name={`items[${index}].price`}
                value={item.price}
                onChange={(e) => updateItem(index, { price: e.target.value })}
                placeholder="0,00 EUR"
                className={inputCls}
                inputMode="decimal"
                required
              />

              <textarea
                name={`items[${index}].description`}
                value={item.description}
                onChange={(e) => updateItem(index, { description: e.target.value })}
                rows={2}
                placeholder={locale === 'de' ? 'Beschreibung dieser Leistung' : '\u041e\u043f\u0438\u0441\u0430\u043d\u0438\u0435 \u044d\u0442\u043e\u0439 \u0443\u0441\u043b\u0443\u0433\u0438'}
                className={`${inputCls} resize-none`}
              />

              {item.service_id === 'custom' && item.title.trim() && (
                <p className="text-xs text-neutral-500">
                  {locale === 'de'
                    ? 'Neue Leistung wird im Katalog gespeichert.'
                    : '\u041d\u043e\u0432\u0430\u044f \u0443\u0441\u043b\u0443\u0433\u0430 \u0431\u0443\u0434\u0435\u0442 \u0441\u043e\u0445\u0440\u0430\u043d\u0435\u043d\u0430 \u0432 \u043a\u0430\u0442\u0430\u043b\u043e\u0433.'}
                </p>
              )}
            </div>
          ))}
        </div>

        <button type="button" onClick={addItem} className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-neutral-300 py-3 text-sm font-medium text-neutral-600 hover:border-blue-500 hover:text-blue-600 dark:border-neutral-700">
          <Plus size={18} />
          {locale === 'de' ? 'Leistung hinzufuegen' : '\u0414\u043e\u0431\u0430\u0432\u0438\u0442\u044c \u0443\u0441\u043b\u0443\u0433\u0443'}
        </button>
        {state.errors?.items && <p className="text-xs text-red-600">{state.errors.items}</p>}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-semibold uppercase text-neutral-500">{t.orderForm.orderAddress}</label>
          <input name="order_address" value={orderAddress} onChange={(e) => { setOrderAddressTouched(true); setOrderAddress(e.target.value); }} className={inputCls} />
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold uppercase text-neutral-500">{t.orderForm.serviceDate}</label>
          <input name="service_date" type="date" defaultValue={toDateLocal(initial?.service_date || new Date().toISOString())} className={inputCls} />
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold uppercase text-neutral-500">{t.orderForm.paymentMethod}</label>
          <select name="payment_method" value={paymentMethod} onChange={handlePaymentMethodChange} className={inputCls}>
            <option value="">{t.orderForm.paymentMethodEmpty}</option>
            <option value="cash">{t.orderForm.paymentCash}</option>
            <option value="transfer">{t.orderForm.paymentTransfer}</option>
            <option value="ec_card">{t.orderForm.paymentCard}</option>
            <option value="paypal">PayPal</option>
          </select>
        </div>
      </div>

      <div className="space-y-1">
        <label className="block text-xs font-semibold uppercase text-neutral-500">{t.orderForm.description}</label>
        <textarea name="description" rows={3} defaultValue={initial?.description || ''} className={`${inputCls} resize-none`} />
      </div>

      {state.formError && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-400">{state.formError}</div>}

      <div className="flex gap-3 pt-4">
        <button type="submit" disabled={isPending} className="flex-1 rounded-xl bg-blue-600 py-3 font-bold text-white shadow-lg shadow-blue-200 transition-transform active:scale-95 disabled:bg-blue-400 dark:shadow-none">
          {isPending ? (
            <span className="flex items-center justify-center gap-2">
              <Spinner size={16} />
              {t.orderForm.saving}
            </span>
          ) : submitLabel}
        </button>
        <Link href={cancelHref} className="flex items-center justify-center rounded-xl border border-neutral-300 px-6 font-semibold hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800">
          {t.orderForm.cancel}
        </Link>
      </div>
    </form>
  );
}
