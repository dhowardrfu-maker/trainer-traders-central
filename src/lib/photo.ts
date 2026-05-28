import { supabase } from "@/integrations/supabase/client";

const isFullUrl = (s: string) => /^(https?:|data:|blob:|\/)/.test(s);

/**
 * Resolve a stored value (storage path or full URL) to a displayable URL.
 * The listing-photos bucket is public so we use getPublicUrl (no signing needed).
 * JSON arrays are parsed and the first URL is returned.
 */
export async function resolvePhotoUrl(pathOrUrl: string | undefined | null): Promise<string> {
  if (!pathOrUrl) return "";

  // If it's a JSON array string, parse it and use the first element
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

  // Use public URL — no signing required for public buckets
  const { data } = supabase.storage
    .from("listing-photos")
    .getPublicUrl(pathOrUrl);

  return data.publicUrl ?? "";
}

export async function resolvePhotoUrls(paths: (string | undefined | null)[]): Promise<string[]> {
  return Promise.all(paths.map((p) => resolvePhotoUrl(p)));
}