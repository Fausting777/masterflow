import Link from 'next/link';
import type { LucideProps } from 'lucide-react';
import type { ComponentType } from 'react';

type Props = {
  icon: ComponentType<LucideProps>;
  title: string;
  description?: string;
  action?: { href: string; label: string };
};

export default function EmptyState({ icon: Icon, title, description, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-200 bg-neutral-50/50 px-6 py-14 text-center dark:border-neutral-800 dark:bg-neutral-900/30">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-400 dark:bg-neutral-800 dark:text-neutral-500">
        <Icon size={26} strokeWidth={1.5} />
      </div>
      <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">{title}</p>
      {description && (
        <p className="mt-1 max-w-xs text-xs text-neutral-500 dark:text-neutral-400">{description}</p>
      )}
      {action && (
        <Link
          href={action.href}
          className="mt-5 inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 active:scale-[0.98]"
        >
          {action.label}
        </Link>
      )}
    </div>
  );
}
