'use client';

import { useEffect, useState } from 'react';

// Событие которое Chrome отправляет когда можно установить
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallButton() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Проверяем, установлено ли уже
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    if (isStandalone) {
      setInstalled(true);
    }

    // Смотрим localStorage — если пользователь уже жал «Не сейчас»
    const isDismissed = localStorage.getItem('install-dismissed');
    if (isDismissed) {
      setDismissed(true);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setPromptEvent(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Если установили во время сессии
    const installedHandler = () => setInstalled(true);
    window.addEventListener('appinstalled', installedHandler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installedHandler);
    };
  }, []);

  async function handleInstall() {
    if (!promptEvent) return;
    await promptEvent.prompt();
    const result = await promptEvent.userChoice;
    if (result.outcome === 'accepted') {
      setInstalled(true);
    }
    setPromptEvent(null);
  }

  function handleDismiss() {
    localStorage.setItem('install-dismissed', '1');
    setDismissed(true);
  }

  if (installed || dismissed || !promptEvent) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:max-w-sm bg-white border border-neutral-200 rounded-xl shadow-lg p-4 z-40">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold shrink-0">
          M
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm">Установить MasterFlow</div>
          <div className="text-xs text-neutral-500 mt-0.5">
            Быстрый доступ с главного экрана
          </div>
          <div className="flex gap-2 mt-3">
            <button
              type="button"
              onClick={handleInstall}
              className="flex-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2"
            >
              Установить
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              className="rounded-lg border border-neutral-300 text-sm px-3 py-2 hover:bg-neutral-50"
            >
              Не сейчас
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
