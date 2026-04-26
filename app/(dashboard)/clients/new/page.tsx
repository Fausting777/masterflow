import Link from 'next/link';
import ClientForm from '@/components/forms/ClientForm';
import { getLocale } from '@/lib/i18n/server';
import { createClientAction } from '../actions';

export default async function NewClientPage() {
  const locale = await getLocale();
  const text =
    locale === 'de'
      ? {
          back: 'Zurück zur Liste',
          title: 'Neuer Kunde',
          submit: 'Kunden erstellen',
        }
      : {
          back: '\u041d\u0430\u0437\u0430\u0434 \u043a \u0441\u043f\u0438\u0441\u043a\u0443',
          title: '\u041d\u043e\u0432\u044b\u0439 \u043a\u043b\u0438\u0435\u043d\u0442',
          submit: '\u0421\u043e\u0437\u0434\u0430\u0442\u044c \u043a\u043b\u0438\u0435\u043d\u0442\u0430',
        };

  return (
    <div className="max-w-lg">
      <div className="mb-4">
        <Link href="/clients" className="text-sm text-neutral-500 hover:text-neutral-700">
          ← {text.back}
        </Link>
      </div>
      <h1 className="mb-4 text-2xl font-semibold">{text.title}</h1>

      <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
        <ClientForm action={createClientAction} cancelHref="/clients" submitLabel={text.submit} />
      </div>
    </div>
  );
}
