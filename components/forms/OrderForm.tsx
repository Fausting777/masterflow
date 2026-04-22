'use client';

import { useActionState, useState } from 'react';
import Link from 'next/link';
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
    service_id?: string | null;
    custom_service_title?: string | null;
    custom_price?: number | null;
    description?: string | null;
    order_address?: string | null;
    scheduled_at?: string | null;
    service_date?: string | null;
    payment_method?: string | null;
    payment_provider?: string | null;
    paid_at?: string | null;
  };
  cancelHref: string;
  submitLabel: string;
};

function toDateTimeLocal(iso: string | null | undefined): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
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

  const values = state.values ?? {
    client_id: initial?.client_id ?? '',
    client_quick_name: '',
    client_quick_phone: '',
    client_quick_address: '',
    client_quick_postal_code: '',
    client_quick_city: '',
    correction_reason: initial?.correction_reason ?? '',
    service_id: initial?.service_id ?? '',
    custom_service_title: initial?.custom_service_title ?? '',
    custom_price:
      initial?.custom_price !== null && initial?.custom_price !== undefined
        ? String(initial.custom_price)
        : '',
    description: initial?.description ?? '',
    order_address: initial?.order_address ?? '',
    scheduled_at: toDateTimeLocal(initial?.scheduled_at),
    service_date: toDateTimeLocal(initial?.service_date),
    payment_method: initial?.payment_method ?? '',
    payment_provider: initial?.payment_provider ?? '',
    paid_at: toDateTimeLocal(initial?.paid_at),
  };

  const [useCustom, setUseCustom] = useState(
    !values.service_id && (values.custom_service_title.length > 0 || services.length === 0)
  );

  const isEditing = Boolean(initial?.client_id);
  const [useQuickClient, setUseQuickClient] = useState(
    !isEditing && !values.client_id && (values.client_quick_name.length > 0 || clients.length === 0)
  );
  const [quickAddress, setQuickAddress] = useState(values.client_quick_address ?? '');
  const [quickPostalCode, setQuickPostalCode] = useState(values.client_quick_postal_code ?? '');
  const [quickCity, setQuickCity] = useState(values.client_quick_city ?? '');
  const [orderAddress, setOrderAddress] = useState(values.order_address ?? '');
  const [orderAddressTouched, setOrderAddressTouched] = useState(Boolean(values.order_address));
  const isCorrection = Boolean(initial?.correction_of_order_id);
  const [paymentMethod, setPaymentMethod] = useState(values.payment_method);
  const [paymentProvider, setPaymentProvider] = useState(values.payment_provider);
  const [paidAt, setPaidAt] = useState(values.paid_at);

  const paymentMetaText =
    locale === 'de'
      ? {
          paymentProvider: 'Zahlungsanbieter',
          paymentProviderEmpty: '— nicht ausgewaehlt —',
          paidAt: 'Bezahlt am',
          paidAtHint: 'Leer lassen, wenn die Zahlung noch nicht erfolgt ist.',
        }
      : {
          paymentProvider: 'Платежный провайдер',
          paymentProviderEmpty: '— не выбрано —',
          paidAt: 'Оплачено',
          paidAtHint: 'Оставьте пустым, если клиент еще не оплатил.',
        };

  const inputCls =
    'w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

  return (
    <form action={formAction} className="space-y-4">
      <CsrfTokenInput />
      <div className="space-y-2">
        {isCorrection && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            {t.orderForm.correctionBanner}
          </div>
        )}

        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium">
            {t.orderForm.client} <span className="text-red-500">*</span>
          </label>
          {!isEditing && (
            <button
              type="button"
              onClick={() => setUseQuickClient(!useQuickClient)}
              className="text-xs text-blue-600 hover:underline"
            >
              {useQuickClient ? t.orderForm.fromDatabase : t.orderForm.quickName}
            </button>
          )}
        </div>

        {useQuickClient ? (
          <div key="quick-client-fields" className="space-y-2">
            <input type="hidden" name="client_id" defaultValue="" />
            <input
              name="client_quick_name"
              type="text"
              defaultValue={values.client_quick_name}
              placeholder={t.orderForm.quickNamePlaceholder}
              className={inputCls}
            />
            <input
              name="client_quick_phone"
              type="tel"
              defaultValue={values.client_quick_phone}
              placeholder={t.orderForm.quickPhonePlaceholder}
              className={inputCls}
            />
            <input
              name="client_quick_address"
              type="text"
              value={quickAddress}
              onChange={(e) => {
                const nextValue = e.target.value;
                setQuickAddress(nextValue);
                if (!orderAddressTouched && orderAddress.trim().length === 0) {
                  setOrderAddress(nextValue);
                }
              }}
              placeholder={t.orderForm.quickAddressPlaceholder}
              className={inputCls}
            />
            <div className="grid grid-cols-3 gap-3">
              <div>
                <input
                  name="client_quick_postal_code"
                  type="text"
                  inputMode="numeric"
                  maxLength={5}
                  value={quickPostalCode}
                  onChange={(e) => setQuickPostalCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="PLZ"
                  className={inputCls}
                />
              </div>
              <div className="col-span-2">
                <input
                  name="client_quick_city"
                  type="text"
                  value={quickCity}
                  onChange={(e) => setQuickCity(e.target.value)}
                  placeholder={t.orderForm.quickCityPlaceholder}
                  className={inputCls}
                />
              </div>
            </div>
            <PostalCodeLookup
              postalCode={quickPostalCode}
              onCityDetected={(city) => setQuickCity((prev) => prev.trim() || city)}
            />
            <p className="text-xs text-neutral-500">{t.orderForm.quickClientHelp}</p>
            {state.errors?.client_quick_name && (
              <p className="text-xs text-red-600">{state.errors.client_quick_name}</p>
            )}
            {state.errors?.client_quick_phone && (
              <p className="text-xs text-red-600">{state.errors.client_quick_phone}</p>
            )}
            {state.errors?.client_quick_address && (
              <p className="text-xs text-red-600">{state.errors.client_quick_address}</p>
            )}
            {state.errors?.client_quick_postal_code && (
              <p className="text-xs text-red-600">{state.errors.client_quick_postal_code}</p>
            )}
            {state.errors?.client_quick_city && (
              <p className="text-xs text-red-600">{state.errors.client_quick_city}</p>
            )}
          </div>
        ) : (
          <div key="existing-client-fields" className="space-y-2">
            <input type="hidden" name="client_quick_name" defaultValue="" />
            <input type="hidden" name="client_quick_phone" defaultValue="" />
            <input type="hidden" name="client_quick_address" defaultValue="" />
            <input type="hidden" name="client_quick_postal_code" defaultValue="" />
            <input type="hidden" name="client_quick_city" defaultValue="" />
            <select name="client_id" defaultValue={values.client_id} className={inputCls}>
              <option value="">{t.orderForm.selectClient}</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.full_name}
                  {client.phone ? ` (${client.phone})` : ''}
                </option>
              ))}
            </select>
          </div>
        )}

        {state.errors?.client_id && <p className="text-xs text-red-600">{state.errors.client_id}</p>}
      </div>

      {isCorrection && (
        <div>
          <label htmlFor="correction_reason" className="mb-1 block text-sm font-medium">
            {t.orderForm.correctionReason}
          </label>
          <textarea
            id="correction_reason"
            name="correction_reason"
            rows={3}
            defaultValue={values.correction_reason}
            placeholder={t.orderForm.correctionReasonPlaceholder}
            className={`${inputCls} resize-y`}
          />
          {state.errors?.correction_reason && (
            <p className="mt-1 text-xs text-red-600">{state.errors.correction_reason}</p>
          )}
        </div>
      )}
      {!isCorrection && <input type="hidden" name="correction_reason" defaultValue="" />}

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium">
            {t.orderForm.service} <span className="text-red-500">*</span>
          </label>
          <button
            type="button"
            onClick={() => {
              const nextUseCustom = !useCustom;
              setUseCustom(nextUseCustom);
            }}
            className="text-xs text-blue-600 hover:underline"
          >
            {useCustom ? t.orderForm.fromCatalog : t.orderForm.customTitle}
          </button>
        </div>

        {useCustom ? (
          <>
            <input type="hidden" name="service_id" defaultValue="" />
            <input
              name="custom_service_title"
              type="text"
              defaultValue={values.custom_service_title}
              placeholder={t.orderForm.customServicePlaceholder}
              className={inputCls}
            />
          </>
        ) : (
          <>
            <input type="hidden" name="custom_service_title" defaultValue="" />
            <select name="service_id" defaultValue={values.service_id} className={inputCls}>
              <option value="">{t.orderForm.selectService}</option>
              {services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.title}
                  {service.default_price !== null ? ` — €${service.default_price}` : ''}
                </option>
              ))}
            </select>
            {services.length === 0 && (
              <p className="mt-1 text-xs text-amber-600">
                {t.orderForm.noServices}{' '}
                <Link href="/services/new" className="underline">
                  {t.orderForm.add}
                </Link>{' '}
                {t.orderForm.orChooseCustom}
              </p>
            )}
          </>
        )}
        {state.errors?.service_id && <p className="mt-1 text-xs text-red-600">{state.errors.service_id}</p>}
      </div>

      <div>
        <label htmlFor="custom_price" className="mb-1 block text-sm font-medium">
          {t.orderForm.price}
        </label>
        <input
          id="custom_price"
          name="custom_price"
          type="text"
          inputMode="decimal"
          defaultValue={values.custom_price}
          placeholder={t.orderForm.pricePlaceholder}
          className={inputCls}
        />
        {state.errors?.custom_price && <p className="mt-1 text-xs text-red-600">{state.errors.custom_price}</p>}
      </div>

      <div>
        <label htmlFor="order_address" className="mb-1 block text-sm font-medium">
          {t.orderForm.orderAddress}
        </label>
        <input
          id="order_address"
          name="order_address"
          type="text"
          value={orderAddress}
          onChange={(e) => {
            setOrderAddressTouched(true);
            setOrderAddress(e.target.value);
          }}
          className={inputCls}
        />
      </div>

      <div>
        <label htmlFor="scheduled_at" className="mb-1 block text-sm font-medium">
          {t.orderForm.scheduledAt}
        </label>
        <input
          id="scheduled_at"
          name="scheduled_at"
          type="datetime-local"
          defaultValue={values.scheduled_at}
          className={inputCls}
        />
      </div>

      <div>
        <label htmlFor="service_date" className="mb-1 block text-sm font-medium">
          {t.orderForm.serviceDate}
        </label>
        <input
          id="service_date"
          name="service_date"
          type="datetime-local"
          defaultValue={values.service_date}
          className={inputCls}
        />
        {state.errors?.service_date && <p className="mt-1 text-xs text-red-600">{state.errors.service_date}</p>}
      </div>

      <div>
        <label htmlFor="payment_method" className="mb-1 block text-sm font-medium">
          {t.orderForm.paymentMethod}
        </label>
        <select
          id="payment_method"
          name="payment_method"
          value={paymentMethod}
          onChange={(e) => {
            const nextMethod = e.target.value;
            setPaymentMethod(nextMethod);
            if (nextMethod !== 'ec_card') {
              setPaymentProvider('');
            } else if (!paymentProvider) {
              setPaymentProvider('sumup');
            }
            if (!paidAt && ['cash', 'ec_card', 'paypal'].includes(nextMethod)) {
              setPaidAt(toDateTimeLocal(new Date().toISOString()));
            }
          }}
          className={inputCls}
        >
          <option value="">{t.orderForm.paymentMethodEmpty}</option>
          <option value="cash">{t.orderForm.paymentCash}</option>
          <option value="transfer">{t.orderForm.paymentTransfer}</option>
          <option value="ec_card">{t.orderForm.paymentCard}</option>
          <option value="paypal">PayPal</option>
        </select>
        {state.errors?.payment_method && (
          <p className="mt-1 text-xs text-red-600">{state.errors.payment_method}</p>
        )}
      </div>

      {paymentMethod === 'ec_card' ? (
        <div>
          <label htmlFor="payment_provider" className="mb-1 block text-sm font-medium">
            {paymentMetaText.paymentProvider}
          </label>
          <select
            id="payment_provider"
            name="payment_provider"
            value={paymentProvider}
            onChange={(e) => setPaymentProvider(e.target.value)}
            className={inputCls}
          >
            <option value="">{paymentMetaText.paymentProviderEmpty}</option>
            <option value="sumup">SumUp</option>
          </select>
          {state.errors?.payment_provider && (
            <p className="mt-1 text-xs text-red-600">{state.errors.payment_provider}</p>
          )}
        </div>
      ) : (
        <input type="hidden" name="payment_provider" value="" />
      )}

      <div>
        <label htmlFor="paid_at" className="mb-1 block text-sm font-medium">
          {paymentMetaText.paidAt}
        </label>
        <input
          id="paid_at"
          name="paid_at"
          type="datetime-local"
          value={paidAt}
          onChange={(e) => setPaidAt(e.target.value)}
          className={inputCls}
        />
        <p className="mt-1 text-xs text-neutral-500">{paymentMetaText.paidAtHint}</p>
        {state.errors?.paid_at && <p className="mt-1 text-xs text-red-600">{state.errors.paid_at}</p>}
      </div>

      <div>
        <label htmlFor="description" className="mb-1 block text-sm font-medium">
          {t.orderForm.description}
        </label>
        <textarea
          id="description"
          name="description"
          rows={4}
          defaultValue={values.description}
          className={`${inputCls} resize-y`}
        />
      </div>

      {state.formError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {state.formError}
        </div>
      )}

      <div className="flex gap-2 pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="flex-1 rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:bg-blue-400"
        >
          {isPending ? t.orderForm.saving : submitLabel}
        </button>
        <Link
          href={cancelHref}
          className="rounded-lg border border-neutral-300 px-4 py-2.5 text-sm font-medium hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
        >
          {t.orderForm.cancel}
        </Link>
      </div>
    </form>
  );
}
