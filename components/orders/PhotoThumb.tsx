'use client';

import { useState, useTransition } from 'react';
import { deletePhotoAction } from '@/app/(dashboard)/orders/[id]/photos/actions';

type Props = {
  photoId: string;
  url: string | null;
};

export default function PhotoThumb({ photoId, url }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [deleted, setDeleted] = useState(false);

  function handleDelete() {
    if (!window.confirm('Удалить это фото?')) return;
    setError(null);
    startTransition(async () => {
      const res = await deletePhotoAction(photoId);
      if (res.ok) {
        setDeleted(true);
      } else {
        setError(res.error ?? 'Ошибка');
      }
    });
  }

  if (deleted) return null;

  return (
    <div className="relative group">
      <div className="aspect-square rounded-lg overflow-hidden bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">
        {url ? (
          <a href={url} target="_blank" rel="noopener noreferrer">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt="Фото заказа"
              className="w-full h-full object-cover"
            />
          </a>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xs text-neutral-400">
            Нет доступа
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={handleDelete}
        disabled={isPending}
        className="absolute top-1 right-1 w-6 h-6 flex items-center justify-center rounded-full bg-black/60 hover:bg-red-600 text-white text-xs opacity-0 group-hover:opacity-100 transition disabled:opacity-60"
        title="Удалить фото"
      >
        ×
      </button>
      {error && (
        <div className="absolute bottom-1 left-1 right-1 text-xs bg-red-600 text-white px-1.5 py-0.5 rounded">
          {error}
        </div>
      )}
    </div>
  );
}