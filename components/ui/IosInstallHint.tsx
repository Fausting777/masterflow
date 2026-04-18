'use client';

import { useEffect, useState } from 'react';

export default function IosInstallHint() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Определяем iOS
    const isIos = /iPhone|iPad|iPod/.test(navigator.userAgent);

    // Если уже в standalone — не показываем
    // Safari отличается: navigator.standalone === true
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const isStandalone = (window.navigator as any).standalone === true;

    if (!isIos || isStandalone) return;

    // Смотрим, не жал ли пользователь "ок, понял"
    if (localStorage.getItem('ios-hint-seen')) return;

    // Показываем через 10 секунд после загрузки (чтобы не душить сразу)
    const t = setTimeout(() => setShow(true), 10_000);
    return () => clearTimeout(t);
  }, []);

  function handleDismiss() {
    localStorage.setItem('ios-hint-seen', '1');
    setShow(false);
  }

  if (!show) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:max-w-sm bg-white border border-neutral-200 rounded-xl shadow-lg p-4 z-40">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0">
          📱
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm">Добавить на главный экран</div>
          <div className="text-xs text-neutral-500 mt-1 leading-relaxed">
            Нажми <strong>«Поделиться»</strong> <span className="inline-block">⤴</span> внизу Safari, затем <strong>«На экран "Домой"»</strong>
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            className="mt-3 text-sm text-blue-600 hover:text-blue-700"
          >
            Понятно
          </button>
        </div>
      </div>
    </div>
  );
}