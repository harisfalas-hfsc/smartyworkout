import { supabase } from "@/integrations/supabase/client";

/**
 * Exercise pictures live in a private bucket, so every link is a short-lived
 * signed URL. Links are remembered in memory for the life of the page so the
 * same picture is not re-signed on every render.
 */
const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24;
const SIGNED_URL_MEMORY_TTL_MS = (SIGNED_URL_TTL_SECONDS - 60) * 1000;
const SIGNED_URL_BATCH_SIZE = 100;

const signedUrlMemory = new Map<string, { url: string; expiresAt: number }>();

export type MediaItem = { path: string; url: string };

function readRemembered(path: string): string | null {
  const remembered = signedUrlMemory.get(path);
  if (!remembered) return null;
  if (remembered.expiresAt <= Date.now()) {
    signedUrlMemory.delete(path);
    return null;
  }
  return remembered.url;
}

function remember(path: string, url: string) {
  signedUrlMemory.set(path, { url, expiresAt: Date.now() + SIGNED_URL_MEMORY_TTL_MS });
}

/** Returns a temporary, private-bucket-safe URL for one exercise picture. */
export async function getExerciseMediaUrl(path: string): Promise<string | null> {
  if (!path) return null;
  const cached = readRemembered(path);
  if (cached) return cached;
  const { data, error } = await supabase.storage
    .from("exercise-library")
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
  if (error || !data?.signedUrl) return null;
  remember(path, data.signedUrl);
  return data.signedUrl;
}

/** Returns temporary URLs for many exercise pictures, batching provider calls. */
export async function getExerciseMediaItems(paths: string[]): Promise<MediaItem[]> {
  const unique = [...new Set(paths.filter(Boolean))];
  const items: MediaItem[] = [];
  const missing: string[] = [];
  for (const path of unique) {
    const cached = readRemembered(path);
    if (cached) items.push({ path, url: cached });
    else missing.push(path);
  }

  for (let i = 0; i < missing.length; i += SIGNED_URL_BATCH_SIZE) {
    const chunk = missing.slice(i, i + SIGNED_URL_BATCH_SIZE);
    const { data, error } = await supabase.storage
      .from("exercise-library")
      .createSignedUrls(chunk, SIGNED_URL_TTL_SECONDS);
    if (error) continue;
    for (const signed of data ?? []) {
      if (!signed.path || !signed.signedUrl) continue;
      remember(signed.path, signed.signedUrl);
      items.push({ path: signed.path, url: signed.signedUrl });
    }
  }
  return items;
}
