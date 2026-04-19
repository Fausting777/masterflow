'use client';

import { useActionState, useState } from 'react';
import Link from 'next/link';
import type { OrderFormState } from '@/app/(dashboard)/orders/actions';
import type { Client, Service } from '@/types/database';

type Props = {
  action: (prev: OrderFormState, fd: FormData) => Promise<OrderFormState>;
  clients: Client[];
  services: Service[];
  initial?: {
    client_id?: string;
    service_id?: string | null;
    custom_service_title?: string | null;
    custom_price?: number | null;
    description?: string | null;
    order_address?: string | null;
    scheduled_at?: string | null;
    service_date?: string | null;    // ← новое
    payment_method?: string | null;    // ← новое
  };
  cancelHref: string;
  submitLabel: string;
};

// Превращает ISO-строку в формат datetime-local input
function toDateTimeLocal(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
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

  const v = state.values ?? {
    client_id: initial?.client_id ?? '',
    client_quick_name: '',         // ← новое
    service_id: initial?.service_id ?? '',
    custom_service_title: initial?.custom_service_title ?? '',
    custom_price:
      initial?.custom_price !== null && initial?.custom_price !== undefined
        ? String(initial.custom_price)
        : '',
    description: initial?.description ?? '',
    order_address: initial?.order_address ?? '',
    scheduled_at: toDateTimeLocal(initial?.scheduled_at),
    service_date: toDateTimeLocal(initial?.service_date),    // ← новое
    payment_method: initial?.payment_method ?? '',    // ← новое
  };

  // Режим услуги: из каталога или кастомная
  const [useCustom, setUseCustom] = useState(
    !v.service_id && (v.custom_service_title.length > 0 || services.length === 0)
  );

 // Quick-mode ТОЛЬКО при создании (когда нет initial?.client_id)
// При редактировании всегда показываем выбор из базы
const isEditing = Boolean(initial?.client_id);
const [useQuickClient, setUseQuickClient] = useState(
  !isEditing && !v.client_id && (v.client_quick_name.length > 0 || clients.length === 0)
);

  return (
    <form action={formAction} className="space-y-4">
      {/* Клиент: из базы ИЛИ быстрое имя */}
<div className="space-y-2">
  <div className="flex items-center justify-between">
    <label className="block text-sm font-medium">
      Клиент <span className="text-red-500">*</span>
    </label>
    {!isEditing && (
  <button
    type="button"
    onClick={() => setUseQuickClient(!useQuickClient)}
    className="text-xs text-blue-600 hover:underline"
  >
    {useQuickClient ? 'Из базы' : 'Быстрое имя'}
  </button>
)}
  </div>

  {useQuickClient ? (
    <>
      {/* Пустой client_id, чтобы не отправлялся выбор */}
      <input type="hidden" name="client_id" value="" />
      <input
        name="client_quick_name"
        type="text"
        defaultValue={v.client_quick_name}
        placeholder="Например: Иван Петров"
        className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <p className="text-xs text-neutral-500">
        Клиент создастся автоматически с этим именем. Телефон, адрес и email можно дозаполнить позже в карточке клиента.
      </p>
      {state.errors?.client_quick_name && (
        <p className="text-xs text-red-600">{state.errors.client_quick_name}</p>
      )}
    </>
  ) : (
    <>
      <input type="hidden" name="client_quick_name" value="" />
      <select
        name="client_id"
        defaultValue={v.client_id}
        className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="">— выберите клиента —</option>
        {clients.map((c) => (
          <option key={c.id} value={c.id}>
            {c.full_name}
            {c.phone ? ` (${c.phone})` : ''}
          </option>
        ))}
      </select>
      {clients.length === 0 && (
        <p className="text-xs text-amber-600">
          У тебя ещё нет клиентов. Нажми «Быстрое имя» чтобы ввести имя прямо сейчас.
        </p>
      )}
    </>
  )}
  {state.errors?.client_id && (
    <p className="text-xs text-red-600">{state.errors.client_id}</p>
  )}
</div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium">
            Услуга <span className="text-red-500">*</span>
          </label>
          <button
            type="button"
            onClick={() => setUseCustom(!useCustom)}
            className="text-xs text-blue-600 hover:underline"
          >
            {useCustom ? 'Из каталога' : 'Своё название'}
          </button>
        </div>

        {useCustom ? (
          <>
            {/* пустой service_id, чтобы не отправлялся старый выбор */}
            <input type="hidden" name="service_id" value="" />
            <input
              name="custom_service_title"
              type="text"
              defaultValue={v.custom_service_title}
              placeholder="Например: Монтаж замка"
              className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </>
        ) : (
          <>
            <input type="hidden" name="custom_service_title" value="" />
            <select
              name="service_id"
              defaultValue={v.service_id}
              className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">— выберите услугу —</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}
                  {s.default_price !== null ? ` — €${s.default_price}` : ''}
                </option>
              ))}
            </select>
            {services.length === 0 && (
              <p className="text-xs text-amber-600 mt-1">
                Нет услуг в каталоге.{' '}
                <Link href="/services/new" className="underline">Добавить</Link>
                {' '}или нажми «Своё название».
              </p>
            )}
          </>
        )}
        {state.errors?.service_id && <p className="text-xs text-red-600 mt-1">{state.errors.service_id}</p>}
      </div>

      <div>
        <label htmlFor="custom_price" className="block text-sm font-medium mb-1">
          Цена, €
        </label>
        <input
          id="custom_price"
          name="custom_price"
          type="text"
          inputMode="decimal"
          defaultValue={v.custom_price}
          placeholder="Если не указать — возьмём из услуги"
          className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {state.errors?.custom_price && <p className="text-xs text-red-600 mt-1">{state.errors.custom_price}</p>}
      </div>

      <div>
        <label htmlFor="order_address" className="block text-sm font-medium mb-1">
          Адрес заказа
        </label>
        <input
          id="order_address"
          name="order_address"
          type="text"
          defaultValue={v.order_address}
          className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label htmlFor="scheduled_at" className="block text-sm font-medium mb-1">
          Запланирован на
        </label>
        <input
          id="scheduled_at"
          name="scheduled_at"
          type="datetime-local"
          defaultValue={v.scheduled_at}
          className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
  <label htmlFor="service_date" className="block text-sm font-medium mb-1">
    Дата выполнения работы
  </label>
  <input
    id="service_date"
    name="service_date"
    type="datetime-local"
    defaultValue={v.service_date}
    className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
  />
  {state.errors?.service_date && (
    <p className="text-xs text-red-600 mt-1">{state.errors.service_date}</p>
  )}
  <p className="text-xs text-neutral-500 mt-1">
    Leistungsdatum для счёта. Проставится автоматически при переводе заказа в «Завершён».
  </p>
</div>

<div>
  <label htmlFor="payment_method" className="block text-sm font-medium mb-1">
    Способ оплаты
  </label>
  <select
    id="payment_method"
    name="payment_method"
    defaultValue={v.payment_method}
    className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
  >
    <option value="">— не выбрано —</option>
    <option value="cash">Barzahlung (наличные)</option>
    <option value="transfer">Überweisung (банковский перевод)</option>
    <option value="ec_card">EC-Karte (карта)</option>
    <option value="paypal">PayPal</option>
  </select>
  {state.errors?.payment_method && (
    <p className="text-xs text-red-600 mt-1">{state.errors.payment_method}</p>
  )}
  <p className="text-xs text-neutral-500 mt-1">
    Отобразится на PDF-счёте как Zahlungsart.
  </p>
</div>
      <div>
        <label htmlFor="description" className="block text-sm font-medium mb-1">
          Описание работы
        </label>
        <textarea
          id="description"
          name="description"
          rows={4}
          defaultValue={v.description}
          className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
        />
      </div>

      {state.formError && (
        <div className="rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 px-3 py-2 text-sm text-red-700 dark:text-red-300">
          {state.formError}
        </div>
      )}

      <div className="flex gap-2 pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="flex-1 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2.5 text-sm transition"
        >
          {isPending ? 'Сохранение...' : submitLabel}
        </button>
        <Link
          href={cancelHref}
          className="rounded-lg border border-neutral-300 dark:border-neutral-700 px-4 py-2.5 text-sm font-medium hover:bg-neutral-50 dark:hover:bg-neutral-800"
        >
          Отмена
        </Link>
      </div>
    </form>
  );
}