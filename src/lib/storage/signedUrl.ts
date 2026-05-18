import { supabase } from "@/integrations/supabase/client";

const DEFAULT_EXPIRY_SECONDS = 60 * 60 * 24 * 365; // 1 year

/**
 * Create a signed URL for an object in a private bucket.
 * Returns null on error.
 */
export async function getSignedStorageUrl(
  bucket: string,
  path: string,
  expiresIn: number = DEFAULT_EXPIRY_SECONDS,
): Promise<string | null> {
  if (!path) return null;
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

/**
 * Extract the object path inside a bucket from a full Supabase storage URL.
 * Returns the value unchanged if it doesn't look like a URL (already a path).
 */
export function extractStoragePath(bucket: string, urlOrPath: string): string | null {
  if (!urlOrPath) return null;
  if (!/^https?:\/\//i.test(urlOrPath)) return urlOrPath;
  const markers = [`/object/public/${bucket}/`, `/object/sign/${bucket}/`, `/${bucket}/`];
  for (const m of markers) {
    const idx = urlOrPath.indexOf(m);
    if (idx !== -1) return urlOrPath.slice(idx + m.length).split("?")[0];
  }
  return null;
}

/** Resolve any stored URL/path into a usable signed URL. */
export async function resolveStorageUrl(
  bucket: string,
  urlOrPath: string | null | undefined,
  expiresIn: number = DEFAULT_EXPIRY_SECONDS,
): Promise<string | null> {
  if (!urlOrPath) return null;
  const path = extractStoragePath(bucket, urlOrPath);
  if (!path) return null;
  return await getSignedStorageUrl(bucket, path, expiresIn);
}
