'use client';

import { useEffect, useRef } from 'react';

type Props = {
  postalCode: string;
  onCityDetected: (city: string) => void;
};

// Кэшируем в памяти, чтобы не дёргать API повторно
const cache = new Map<string, string>();

export default function PostalCodeLookup({ postalCode, onCityDetected }: Props) {
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const trimmed = postalCode.trim();

    // Работаем только если PLZ = ровно 5 цифр
    if (!/^\d{5}$/.test(trimmed)) return;

    // Если есть в кэше
    if (cache.has(trimmed)) {
      onCityDetected(cache.get(trimmed)!);
      return;
    }

    // Отменяем предыдущий запрос
    if (abortRef.current) abortRef.current.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    // Debounce 300 мс — чтобы не слать запрос на каждый символ
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`https://api.zippopotam.us/de/${trimmed}`, {
          signal: ac.signal,
        });
        if (!res.ok) return;
        const data: { places?: Array<{ 'place name'?: string }> } = await res.json();
        const city = data.places?.[0]?.['place name'];
        if (city) {
          cache.set(trimmed, city);
          onCityDetected(city);
        }
      } catch {
        // Игнорируем — или abort, или сетевая ошибка, или 404 (невалидный PLZ)
      }
    }, 300);

    return () => {
      clearTimeout(t);
      ac.abort();
    };
  }, [postalCode, onCityDetected]);

  return null; // Компонент без UI
}