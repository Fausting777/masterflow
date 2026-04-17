'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { saveSignatureAction } from '@/app/(dashboard)/orders/[id]/signature/actions';

type Props = {
  orderId: string;
};

export default function SignaturePad({ orderId }: Props) {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  const [isEmpty, setIsEmpty] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Готовим canvas — учитываем device pixel ratio, чтобы линия не была размытой на ретине
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

    // Перерисовываем при повороте экрана
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
      setError('Подпись не поставлена');
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;

    setError(null);

    // Конвертируем canvas в Blob (PNG)
    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob(resolve, 'image/png')
    );
    if (!blob) {
      setError('Не удалось создать изображение');
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
        setError(res.error ?? 'Ошибка сохранения');
      }
    });
  }

  return (
    <div>
      <div className="rounded-xl border-2 border-dashed border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 overflow-hidden">
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="w-full h-64 touch-none cursor-crosshair"
        />
      </div>

      <p className="text-xs text-neutral-500 mt-2 text-center">
        Подпишитесь пальцем в рамке
      </p>

      {error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 px-3 py-2 text-sm text-red-700 dark:text-red-300 mt-3">
          {error}
        </div>
      )}

      <div className="flex gap-2 mt-4">
        <button
          type="button"
          onClick={handleClear}
          disabled={isPending || isEmpty}
          className="rounded-lg border border-neutral-300 dark:border-neutral-700 px-4 py-2.5 text-sm font-medium hover:bg-neutral-50 dark:hover:bg-neutral-800 disabled:opacity-50"
        >
          Очистить
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending || isEmpty}
          className="flex-1 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2.5 text-sm transition"
        >
          {isPending ? 'Сохранение...' : 'Сохранить подпись'}
        </button>
      </div>
    </div>
  );
}