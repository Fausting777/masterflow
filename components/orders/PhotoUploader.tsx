'use client';

import { useRef, useState, useTransition } from 'react';
import { uploadPhotoAction } from '@/app/(dashboard)/orders/[id]/photos/actions';
import type { PhotoType } from '@/types/database';

type Props = {
  orderId: string;
  photoType: PhotoType;
  label: string;
};

export default function PhotoUploader({ orderId, photoType, label }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setError(null);

    // Загружаем файлы по одному, чтобы не забивать соединение на мобильном
    startTransition(async () => {
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append('order_id', orderId);
        fd.append('photo_type', photoType);
        fd.append('file', file);

        const res = await uploadPhotoAction(fd);
        if (!res.ok) {
          setError(res.error ?? 'Ошибка загрузки');
          break;
        }
      }
      // Очищаем input, чтобы можно было выбрать те же файлы ещё раз
      if (inputRef.current) inputRef.current.value = '';
    });
  }

  return (
    <div>
      <label className="block">
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          capture="environment"
          multiple
          onChange={handleChange}
          disabled={isPending}
          className="sr-only"
        />
        <span
          className={`inline-flex items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-3 text-sm font-medium cursor-pointer w-full transition ${
            isPending
              ? 'border-neutral-300 text-neutral-400 cursor-wait'
              : 'border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:border-blue-500 hover:text-blue-600'
          }`}
        >
          {isPending ? (
            <>Загрузка...</>
          ) : (
            <>
              <span>📷</span>
              <span>{label}</span>
            </>
          )}
        </span>
      </label>
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}
