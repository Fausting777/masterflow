'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { saveSignatureAction } from '@/app/(dashboard)/orders/[id]/signature/actions';
import { useI18n } from '@/components/i18n/LocaleProvider';

type Props = {
  orderId: string;
};

export default function SignaturePad({ orderId }: Props) {
  const { locale } = useI18n();
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  const [isEmpty, setIsEmpty] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const text =
    locale === 'de'
      ? {
          signatureEmpty: 'Es wurde keine Unterschrift gesetzt',
          signatureRenderFailed: 'Das Bild konnte nicht erstellt werden',
          genericError: 'Fehler beim Speichern',
          signHere: 'Bitte hier mit Finger oder Maus unterschreiben',
          clear: 'Leeren',
          saveSignature: 'Unterschrift speichern',
          saving: 'Wird gespeichert...',
        }
      : {
          signatureEmpty: 'Подпись не поставлена',
          signatureRenderFailed: 'Не удалось создать изображение',
          genericError: 'Ошибка сохранения',
          signHere: 'Подпишитесь пальцем или мышью',
          clear: 'Очистить',
          saveSignature: 'Сохранить подпись',
          saving: 'Сохранение...',
        };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const setupCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = '#111827';
      }
    };

    setupCanvas();

    window.addEventListener('resize', setupCanvas);
    return () => window.removeEventListener('resize', setupCanvas);
  }, []);

  function getPoint(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    e.preventDefault();
    const point = getPoint(e);
    if (!point) return;
    const canvas = canvasRef.current;
    if (canvas) canvas.setPointerCapture(e.pointerId);
    drawingRef.current = true;
    lastPointRef.current = point;
    setIsEmpty(false);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    const point = getPoint(e);
    const canvas = canvasRef.current;
    const last = lastPointRef.current;
    if (!point || !canvas || !last) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.beginPath();
    ctx.moveTo(last.x, last.y);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();

    lastPointRef.current = point;
  }

  function handlePointerUp() {
    drawingRef.current = false;
    lastPointRef.current = null;
  }

  function handleClear() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    setIsEmpty(true);
  }

  async function handleSave() {
    if (isEmpty) {
      setError(text.signatureEmpty);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    setError(null);

    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob(resolve, 'image/png')
    );

    if (!blob) {
      setError(text.signatureRenderFailed);
      return;
    }

    startTransition(async () => {
      const fd = new FormData();
      fd.append('order_id', orderId);
      fd.append('file', blob, 'signature.png');

      const res = await saveSignatureAction(fd);
      if (res.ok) {
        router.push(`/orders/${orderId}`);
      } else {
        setError(res.error ?? text.genericError);
      }
    });
  }

  return (
    <div>
      <div className="overflow-hidden rounded-xl border-2 border-dashed border-neutral-300 bg-white dark:border-neutral-700 dark:bg-neutral-900">
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="h-64 w-full touch-none cursor-crosshair"
        />
      </div>

      <p className="mt-2 text-center text-xs text-neutral-500">{text.signHere}</p>

      {error && (
        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={handleClear}
          disabled={isPending || isEmpty}
          className="rounded-lg border border-neutral-300 px-4 py-2.5 text-sm font-medium hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
        >
          {text.clear}
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending || isEmpty}
          className="flex-1 rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:bg-blue-400"
        >
          {isPending ? text.saving : text.saveSignature}
        </button>
      </div>
    </div>
  );
}
