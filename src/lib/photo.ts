import { supabase } from "@/integrations/supabase/client";

const SIGN_TTL_SECONDS = 60 * 60; // 1 hour
const cache = new Map<string, { url: string; exp: number }>();

const isFullUrl = (s: string) => /^(https?:|data:|blob:|\/)/.test(s);

/**
 * Resolve a stored value (storage path or full URL) to a displayable URL.
 * Static/sample images and legacy public URLs pass through unchanged.
 * JSON arrays are parsed and the first URL is returned.
 */
export async function resolvePhotoUrl(pathOrUrl: string | undefined | null): Promise<string> {
  if (!pathOrUrl) return "";

  // If it's a JSON array string, parse it and use the first URL
  const trimmed = pathOrUrl.trim();
  if (trimmed.startsWith("[")) {
    try {
      const arr = JSON.parse(trimmed);
      if (Array.isArray(arr) && arr.length > 0) {
        return resolvePhotoUrl(arr[0]);
      }
    } catch {
      // fall through
    }
    return "";
  }

  if (isFullUrl(pathOrUrl)) return pathOrUrl;

  const now = Date.now();
  const hit = cache.get(pathOrUrl);
  if (hit && hit.exp > now + 60_000) return hit.url;

  const { data, error } = await supabase.storage
    .from("listing-photos")
    .createSignedUrl(pathOrUrl, SIGN_TTL_SECONDS);

  if (error || !data?.signedUrl) {
    console.warn("[photo] sign failed", pathOrUrl, error);
    return "";
  }
  cache.set(pathOrUrl, { url: data.signedUrl, exp: now + SIGN_TTL_SECONDS * 1000 });
  return data.signedUrl;
}

export async function resolvePhotoUrls(paths: (string | undefined | null)[]): Promise<string[]> {
  return Promise.all(paths.map((p) => resolvePhotoUrl(p)));
}