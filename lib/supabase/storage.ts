// lib/supabase/storage.ts
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Получает подписанный URL для файла в приватном бакете.
 * Возвращает null, если ошибка или путь пустой.
 */
export async function getSignedUrl(
  supabase: SupabaseClient,
  bucket: string,
  path: string,
  expiresIn = 3600 // 1 час — хватает для просмотра/скачивания
): Promise<string | null> {
  if (!path) return null;
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);
  if (error || !data) return null;
  return data.signedUrl;
}

/**
 * Массово получает signed URLs для списка путей.
 * Возвращает массив { path, url } — url может быть null.
 */
export async function getSignedUrls(
  supabase: SupabaseClient,
  bucket: string,
  paths: string[],
  expiresIn = 3600
): Promise<Array<{ path: string; url: string | null }>> {
  if (paths.length === 0) return [];
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrls(paths, expiresIn);
  if (error || !data) return paths.map((p) => ({ path: p, url: null }));
  return data.map((item) => ({
    path: item.path ?? '',
    url: item.signedUrl ?? null,
  }));
}