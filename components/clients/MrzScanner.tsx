'use client';

import { useState, useRef } from 'react';
import { parseMrz, formatFullName, type MrzData } from '@/lib/mrz/parse';

type Props = {
  onResult: (data: { fullName: string; mrz: MrzData }) => void;
};

export default function MrzScanner({ onResult }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ocr' | 'ready'>('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<MrzData | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setPreview(null);
    setStatus('loading');
    setProgress(0);

    try {
      // Динамически подгружаем tesseract — не утяжеляем главный бандл
      const { default: Tesseract } = await import('tesseract.js');

      setStatus('ocr');

      // Создаём worker, распознаём
      const worker = await Tesseract.createWorker('eng', 1, {
        logger: (m) => {
          if (m.status === 'recognizing text' && typeof m.progress === 'number') {
            setProgress(Math.round(m.progress * 100));
          }
        },
      });

      // В MRZ только A-Z, 0-9 и '<' — ограничиваем whitelist для точности
      await worker.setParameters({
        tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<',
      });

      const { data } = await worker.recognize(file);
      await worker.terminate();

      const mrz = parseMrz(data.text);
      if (!mrz) {
        setError(
          'MRZ не распознан. Убедись что на фото видны все 3 строки с символами <<<.'
        );
        setStatus('idle');
        return;
      }

      setPreview(mrz);
      setStatus('ready');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка распознавания');
      setStatus('idle');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  function handleApply() {
    if (!preview) return;
    onResult({
      fullName: formatFullName(preview),
      mrz: preview,
    });
    setPreview(null);
    setStatus('idle');
  }

  function handleCancel() {
    setPreview(null);
    setStatus('idle');
    setError(null);
  }

  return (
    <div>
      {status === 'idle' && !preview && (
        <label className="block">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFile}
            className="sr-only"
          />
          <span className="inline-flex items-center justify-center gap-2 rounded-lg border border-dashed border-neutral-300 px-3 py-2 text-sm font-medium cursor-pointer hover:border-blue-500 hover:text-blue-600 transition">
            📷 Сканировать Personalausweis
          </span>
        </label>
      )}

      {status === 'loading' && (
        <div className="rounded-lg bg-blue-50 border border-blue-200 px-3 py-2 text-sm text-blue-700">
          Загрузка распознавателя…
        </div>
      )}

      {status === 'ocr' && (
        <div className="rounded-lg bg-blue-50 border border-blue-200 px-3 py-2 text-sm text-blue-700">
          Распознаём MRZ… {progress}%
          <div className="mt-2 h-1 bg-blue-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {preview && (
        <div className="rounded-lg bg-green-50 border border-green-200 p-3 space-y-2">
          <div className="text-sm font-medium text-green-900 flex items-center gap-2">
            ✅ Распознано ({preview.documentType === 'P' ? 'паспорт' : 'ID'})
          </div>

          <div className="text-sm space-y-1">
            <div>
              <span className="text-neutral-600">Имя: </span>
              <span className="font-medium">{preview.firstName || '—'}</span>
            </div>
            <div>
              <span className="text-neutral-600">Фамилия: </span>
              <span className="font-medium">{preview.lastName || '—'}</span>
            </div>
            {preview.birthDate && (
              <div>
                <span className="text-neutral-600">Дата рождения: </span>
                <span className="font-medium">
                  {new Date(preview.birthDate).toLocaleDateString('de-DE')}
                </span>
              </div>
            )}
            {preview.expiryDate && (
              <div>
                <span className="text-neutral-600">Действителен до: </span>
                <span className="font-medium">
                  {new Date(preview.expiryDate).toLocaleDateString('de-DE')}
                </span>
              </div>
            )}
            <div>
              <span className="text-neutral-600">Страна: </span>
              <span className="font-medium">{preview.issuingCountry}</span>
            </div>
          </div>

          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
            ⚠️ Умлауты (ä/ö/ü) в документе часто пишутся как AE/OE/UE. Проверь и поправь руками.
          </p>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={handleApply}
              className="flex-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 text-sm"
            >
              Заполнить форму
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="rounded-lg border border-neutral-300 px-3 py-2 text-sm hover:bg-neutral-50"
            >
              Отмена
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700 mt-2">
          {error}
        </div>
      )}
    </div>
  );
}