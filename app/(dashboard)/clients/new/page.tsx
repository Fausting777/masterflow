import Link from 'next/link';
import ClientForm from '@/components/forms/ClientForm';
import { createClientAction } from '../actions';

export default function NewClientPage() {
  return (
    <div className="max-w-lg">
      <div className="mb-4">
        <Link
          href="/clients"
          className="text-sm text-neutral-500 hover:text-neutral-700"
        >
          ← Назад к списку
        </Link>
      </div>
      <h1 className="text-2xl font-semibold mb-4">Новый клиент</h1>

      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5">
        <ClientForm
          action={createClientAction}
          cancelHref="/clients"
          submitLabel="Создать клиента"
        />
      </div>
    </div>
  );
}