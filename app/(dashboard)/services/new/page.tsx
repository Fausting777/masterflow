import Link from 'next/link';
import ServiceForm from '@/components/forms/ServiceForm';
import { createServiceAction } from '../actions';

export default function NewServicePage() {
  return (
    <div className="max-w-lg">
      <div className="mb-4">
        <Link href="/services" className="text-sm text-neutral-500 hover:text-neutral-700">
          ← Назад к списку
        </Link>
      </div>
      <h1 className="text-2xl font-semibold mb-4">Новая услуга</h1>
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5">
        <ServiceForm action={createServiceAction} cancelHref="/services" submitLabel="Создать услугу" />
      </div>
    </div>
  );
}