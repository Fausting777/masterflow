'use client';

import { useActionState, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Trash2 } from 'lucide-react';
import PostalCodeLookup from '@/components/clients/PostalCodeLookup';
import { useI18n } from '@/components/i18n/LocaleProvider';
import type { OrderFormState } from '@/app/(dashboard)/orders/actions';
import CsrfTokenInput from '@/components/security/CsrfTokenInput';
import type { Client, Service } from '@/types/database';

type Props = {
  action: (prev: OrderFormState, fd: FormData) => Promise<OrderFormState>;
  clients: Client[];
  services: Service[];
  initial?: {
    correction_of_order_id?: string | null;
    correction_reason?: string | null;
    client_id?: string;
    description?: string | null;
    order_address?: string | null;
    scheduled_at?: string | null;
    service_date?: string | null;
    payment_method?: string | null;
    payment_provider?: string | null;
    paid_at?: string | null;
    items?: {
      service_id: string | null;
      title: string;
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

  const [items, setItems] = useState(() => {
    if (initial?.items && initial.items.length > 0) {
      return initial.items.map(it => ({
        service_id: it.service_id ?? 'custom',
        title: it.title,
        price: String(it.price),
        save_to_catalog: false
      }));
    }
    return [{ service_id: '', title: '', price: '', save_to_catalog: false }];
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

  const addItem = () => {
    setItems([...items, { service_id: '', title: '', price: '', save_to_catalog: false }]);
  };

  const removeItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, patch: Partial<typeof items[0]>) => {
    const newItems = [...items];
    const item = { ...newItems[index], ...patch };
    
    // Если выбрали услугу из каталога, заполняем заголовок и цену
    if (patch.service_id && patch.service_id !== 'custom' && patch.service_id !== '') {
      const s = services.find(s => s.id === patch.service_id);
      if (s) {
        item.title = s.title;
        item.price = s.default_price !== null ? String(s.default_price) : '';
      }
    } else if (patch.service_id === 'custom') {
      item.title = '';
      item.price = '';
    }

    newItems[index] = item;
    setItems(newItems);
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

  const handlePaymentMethodChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
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
  }, [paymentProvider, paidAt]);

  const inputCls = 'w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

  return (
    <form action={formAction} className="space-y-6">
      <CsrfTokenInput />
      
      {/* КЛИЕНТ */}
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
            <input value={quickAddress} onChange={e => setQuickAddress(e.target.value)} name="client_quick_address" placeholder={t.orderForm.quickAddressPlaceholder} className={inputCls} />
            <div className="grid grid-cols-3 gap-2">
              <input value={quickPostalCode} onChange={e => setQuickPostalCode(e.target.value.replace(/\D/g, ''))} name="client_quick_postal_code" maxLength={5} placeholder="PLZ" className={inputCls} />
              <input value={quickCity} onChange={e => setQuickCity(e.target.value)} name="client_quick_city" placeholder={t.orderForm.quickCityPlaceholder} className="col-span-2 w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm" />
            </div>
            <PostalCodeLookup postalCode={quickPostalCode} onCityDetected={c => setQuickCity(prev => prev || c)} />
          </div>
        ) : (
          <select name="client_id" value={selectedClientId} onChange={e => setSelectedClientId(e.target.value)} className={inputCls}>
            <option value="">{t.orderForm.selectClient}</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.full_name} {c.phone && `(${c.phone})`}</option>)}
          </select>
        )}
      </div>

      {/* УСЛУГИ */}
      <div className="space-y-3">
        <label className="text-sm font-semibold">{locale === 'de' ? 'Leistungen' : 'Услуги'} *</label>
        <div className="space-y-4">
          {items.map((item, index) => (
            <div key={index} className="relative space-y-2 rounded-xl border border-neutral-200 p-3 shadow-sm dark:border-neutral-800">
              {items.length > 1 && (
                <button type="button" onClick={() => removeItem(index)} className="absolute -right-2 -top-2 rounded-full bg-red-100 p-1 text-red-600 hover:bg-red-200 dark:bg-red-900/30">
                  <Trash2 size={16} />
                </button>
              )}
              
              <div className="grid gap-2">
                <select 
                  name={`items[${index}].service_id`} 
                  value={item.service_id} 
                  onChange={e => updateItem(index, { service_id: e.target.value })} 
                  className={inputCls}
                >
                  <option value="">{t.orderForm.selectService}</option>
                  <option value="custom">{locale === 'de' ? '— Eigene Leistung —' : '— Своя услуга —'}</option>
                  {services.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                </select>

                <input 
                  name={`items[${index}].title`} 
                  value={item.title} 
                  onChange={e => updateItem(index, { title: e.target.value })} 
                  placeholder={t.orderForm.customServicePlaceholder} 
                  className={inputCls} 
                  required 
                />

                <div className="flex gap-2">
                  <input 
                    name={`items[${index}].price`} 
                    value={item.price} 
                    onChange={e => updateItem(index, { price: e.target.value })} 
                    placeholder="0,00 €" 
                    className={inputCls} 
                    inputMode="decimal"
                    required 
                  />
                  {item.service_id === 'custom' && (
                    <label className="flex items-center gap-2 whitespace-nowrap text-xs">
                      <input 
                        type="checkbox" 
                        name={`items[${index}].save_to_catalog`} 
                        value="true"
                        checked={item.save_to_catalog} 
                        onChange={e => updateItem(index, { save_to_catalog: e.target.checked })} 
                      />
                      {locale === 'de' ? 'Speichern' : 'В каталог'}
                    </label>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        <button type="button" onClick={addItem} className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-neutral-300 py-3 text-sm font-medium text-neutral-600 hover:border-blue-500 hover:text-blue-600 dark:border-neutral-700">
          <Plus size={18} />
          {locale === 'de' ? 'Leistung hinzufügen' : 'Добавить услугу'}
        </button>
        {state.errors?.items && <p className="text-xs text-red-600">{state.errors.items}</p>}
      </div>

      {/* ОСТАЛЬНЫЕ ПОЛЯ */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-semibold uppercase text-neutral-500">{t.orderForm.orderAddress}</label>
          <input name="order_address" value={orderAddress} onChange={e => { setOrderAddressTouched(true); setOrderAddress(e.target.value); }} className={inputCls} />
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
          {isPending ? t.orderForm.saving : submitLabel}
        </button>
        <Link href={cancelHref} className="flex items-center justify-center rounded-xl border border-neutral-300 px-6 font-semibold hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800">
          {t.orderForm.cancel}
        </Link>
      </div>
    </form>
  );
}
