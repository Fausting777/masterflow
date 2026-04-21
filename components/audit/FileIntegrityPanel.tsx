type Props = {
  title: string;
  hash: string | null | undefined;
  path?: string | null | undefined;
  locale: 'ru' | 'de';
};

export default function FileIntegrityPanel({ title, hash, path, locale }: Props) {
  const text =
    locale === 'de'
      ? {
          missing: 'Hash wird nach dem Archivieren neuer Dateien gespeichert.',
          path: 'Pfad',
          sha: 'SHA-256',
        }
      : {
          missing: 'Хеш сохраняется после архивирования новых файлов.',
          path: 'Путь',
          sha: 'SHA-256',
        };

  return (
    <div className="mb-4 rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
      <h2 className="mb-3 text-sm font-medium text-neutral-500">{title}</h2>
      {hash ? (
        <div className="space-y-2 text-sm">
          <div className="grid gap-1">
            <div className="text-xs uppercase tracking-wide text-neutral-400">{text.sha}</div>
            <code className="break-all rounded-lg bg-neutral-100 px-3 py-2 text-xs text-neutral-800 dark:bg-neutral-800 dark:text-neutral-100">
              {hash}
            </code>
          </div>
          {path && (
            <div className="grid gap-1">
              <div className="text-xs uppercase tracking-wide text-neutral-400">{text.path}</div>
              <code className="break-all rounded-lg bg-neutral-50 px-3 py-2 text-xs text-neutral-600 dark:bg-neutral-900 dark:text-neutral-300">
                {path}
              </code>
            </div>
          )}
        </div>
      ) : (
        <p className="text-sm text-neutral-500">{text.missing}</p>
      )}
    </div>
  );
}
